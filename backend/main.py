"""
LLM-Bench Backend API
FastAPI application with health check and chat endpoints
"""
import json
from datetime import datetime
from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from schemas import ChatRequest, ChatMessage, ErrorResponse
from adapters import Message
from adapters.openai import OpenAIAdapter
from adapters.anthropic import AnthropicAdapter
from adapters.deepseek import DeepSeekAdapter
from adapters.ollama import OllamaAdapter
from models import BenchRequest
from benchmark import run_benchmark
from pydantic import BaseModel
import os
import httpx
from fastapi import Header
import logging
from typing import Optional
from tools.registry import tool_registry

logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Console output
        logging.FileHandler('benchmark.log', mode='a')  # File output
    ]
)

app = FastAPI(
    title="LLM-Bench API",
    description="Backend API for LLM benchmarking platform",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "https://idoai.dev",  # Production domain
        "https://www.idoai.dev",  # Production domain with www
        "https://llm-bench.vercel.app",  # Vercel production
        "https://*.vercel.app"  # Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


@app.get("/api/health")
async def api_health_check():
    """API health check endpoint"""
    return {"status": "ok"}


@app.post("/api/test-openai")
async def test_openai(
    openai_key: str | None = Header(None, alias="X-OpenAI-API-Key")
):
    """Test OpenAI API directly"""
    if not openai_key:
        return {"error": "No OpenAI API key provided"}
    
    import httpx
    
    # Test with a simple non-streaming request
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-3.5-turbo",
                    "messages": [{"role": "user", "content": "Say hello"}],
                    "max_tokens": 10
                },
                timeout=30.0
            )
            
            return {
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response.text
            }
    except Exception as e:
        return {"error": str(e)}


class ApiKeysRequest(BaseModel):
    apiKeys: dict[str, str]


class TestsetGenerationRequest(BaseModel):
    topic: str
    numQuestions: int = 5
    difficulty: str = "mixed"  # easy, medium, hard, mixed
    categories: Optional[str] = None
    customInstructions: Optional[str] = None
    provider: Optional[str] = None  # openai, anthropic, deepseek, ollama
    model: Optional[str] = None  # specific model to use
    testFormatOutput: Optional[bool] = False
    outputFormat: Optional[str] = None  # json, csv, xml, yaml, etc.


@app.post("/api/settings")
async def update_settings(request: ApiKeysRequest):
    """Update API keys from frontend settings"""
    # In production, you'd encrypt these before storing
    # For now, we'll set them as environment variables for the current session
    for provider, key in request.apiKeys.items():
        if key:
            if provider == "openai":
                os.environ["OPENAI_API_KEY"] = key
            elif provider == "anthropic":
                os.environ["ANTHROPIC_API_KEY"] = key
            elif provider == "deepseek":
                os.environ["DEEPSEEK_API_KEY"] = key
            elif provider == "tavily":
                os.environ["TAVILY_API_KEY"] = key
            elif provider == "ollamaUrl":
                os.environ["OLLAMA_URL"] = key
    
    return {"status": "ok", "message": "API keys updated"}


@app.get("/api/models/{provider}")
async def get_models(
    provider: str,
    openai_key: str | None = Header(None, alias="X-OpenAI-API-Key"),
    anthropic_key: str | None = Header(None, alias="X-Anthropic-API-Key"),
    deepseek_key: str | None = Header(None, alias="X-DeepSeek-API-Key"),
    tavily_key: str | None = Header(None, alias="X-Tavily-API-Key"),
    ollama_url: str | None = Header(None, alias="X-Ollama-URL")
):
    """Get available models for a specific provider"""
    # Set API keys from headers if provided and not empty
    if openai_key and openai_key != "empty":
        openai_key = openai_key.strip()
        logger.info(f"get_models: Setting OpenAI API key from header: {openai_key[:7]}...{openai_key[-4:] if len(openai_key) > 11 else ''}")
        os.environ["OPENAI_API_KEY"] = openai_key
    if anthropic_key and anthropic_key != "empty":
        os.environ["ANTHROPIC_API_KEY"] = anthropic_key
    if deepseek_key and deepseek_key != "empty":
        os.environ["DEEPSEEK_API_KEY"] = deepseek_key
    if tavily_key and tavily_key != "empty":
        os.environ["TAVILY_API_KEY"] = tavily_key
    if ollama_url and ollama_url != "empty":
        os.environ["OLLAMA_URL"] = ollama_url
    
    adapter_class = ADAPTERS.get(provider)
    if not adapter_class:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown provider: {provider}"
        )
    
    try:
        # Initialize adapter with appropriate model (doesn't matter for listing)
        adapter = adapter_class(model="placeholder")
        models = await adapter.list_models()
        
        return {
            "provider": provider,
            "models": models
        }
    except ValueError as e:
        # Missing API key
        raise HTTPException(
            status_code=401,
            detail=str(e)
        )
    except httpx.HTTPStatusError as e:
        # API error
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Provider API error: {e.response.text}"
        )
    except Exception as e:
        # Other errors
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch models: {str(e)}"
        )


# Provider adapter mapping
ADAPTERS = {
    "openai": OpenAIAdapter,
    "anthropic": AnthropicAdapter,
    "deepseek": DeepSeekAdapter,
    "ollama": OllamaAdapter
}


async def stream_chat_response(
    adapter, 
    messages: list[Message], 
    **kwargs
) -> AsyncGenerator[str, None]:
    """Stream chat response from adapter"""
    try:
        async for chunk in adapter.stream(messages, **kwargs):
            yield chunk
    except Exception as e:
        yield f"\n\nError: {str(e)}"


@app.post("/api/chat", response_model=None)
async def chat(
    request: ChatRequest,
    openai_key: str | None = Header(None, alias="X-OpenAI-API-Key"),
    anthropic_key: str | None = Header(None, alias="X-Anthropic-API-Key"),
    deepseek_key: str | None = Header(None, alias="X-DeepSeek-API-Key"),
    tavily_key: str | None = Header(None, alias="X-Tavily-API-Key"),
    ollama_url: str | None = Header(None, alias="X-Ollama-URL")
):
    """
    Chat endpoint that streams responses from LLM providers
    """
    # Debug log incoming API keys
    logger.info("=== Chat endpoint called ===")
    logger.info(f"Provider: {request.provider}")
    logger.info(f"Model: {request.model}")
    logger.info(f"Enable tools: {request.enable_tools}")
    logger.info(f"Stream: {request.stream}")
    logger.info(f"Messages count: {len(request.messages)}")
    logger.info(f"First message: {request.messages[0].role}: {request.messages[0].content[:50] if request.messages else 'No messages'}...")
    
    # Set API keys from headers if provided and not empty
    if openai_key and openai_key != "empty":
        # Clean the API key (remove any whitespace)
        openai_key = openai_key.strip()
        logger.info(f"Setting OpenAI API key from header: {openai_key[:7]}...{openai_key[-4:] if len(openai_key) > 11 else ''}")
        logger.info(f"API key validation - starts with 'sk-': {openai_key.startswith('sk-')}, length: {len(openai_key)}")
        os.environ["OPENAI_API_KEY"] = openai_key
    else:
        existing = os.getenv("OPENAI_API_KEY")
        if existing:
            logger.info(f"Using existing OpenAI API key: {existing[:7]}...{existing[-4:] if len(existing) > 11 else ''}")
        else:
            logger.warning("No OpenAI API key available")
    
    if anthropic_key and anthropic_key != "empty":
        os.environ["ANTHROPIC_API_KEY"] = anthropic_key
    if deepseek_key and deepseek_key != "empty":
        os.environ["DEEPSEEK_API_KEY"] = deepseek_key
    if tavily_key and tavily_key != "empty":
        os.environ["TAVILY_API_KEY"] = tavily_key
    if ollama_url and ollama_url != "empty":
        os.environ["OLLAMA_URL"] = ollama_url
    
    # Get the appropriate adapter
    adapter_class = ADAPTERS.get(request.provider)
    if not adapter_class:
        raise HTTPException(
            status_code=400, 
            detail=f"Unknown provider: {request.provider}"
        )
    
    # Initialize adapter
    try:
        adapter = adapter_class(model=request.model)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize {request.provider} adapter: {str(e)}"
        )
    
    # Convert request messages to adapter format
    messages = [
        Message(role=msg.role, content=msg.content or "") 
        for msg in request.messages
    ]
    
    # Handle streaming vs non-streaming
    if request.stream:
        # Return streaming response
        return StreamingResponse(
            stream_chat_response(
                adapter,
                messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens
            ),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "X-Content-Type-Options": "nosniff"
            }
        )
    else:
        # Return complete response
        try:
            if request.enable_tools and hasattr(adapter, 'chat_with_tools'):
                # Get tool definitions
                tool_definitions = tool_registry.get_tool_definitions()
                logger.info(f"Tools enabled for chat. Available tools: {len(tool_definitions)}")
                logger.info(f"Tool definitions: {[t['function']['name'] for t in tool_definitions]}")
                
                # Call with tools
                response, tool_calls = await adapter.chat_with_tools(
                    messages,
                    tools=tool_definitions,
                    model=request.model,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens
                )
                logger.info(f"Response from chat_with_tools: {response[:100] if response else 'None'}...")
                logger.info(f"Tool calls made: {len(tool_calls) if tool_calls else 0}")
                
                # If tools were called, execute them
                tool_results = []
                if tool_calls:
                    logger.info(f"Processing {len(tool_calls)} tool calls")
                    
                    # IMPORTANT: Add assistant message with tool calls FIRST
                    messages.append(Message(
                        role="assistant",
                        content=response,  # Can be None when there are tool_calls
                        tool_calls=tool_calls
                    ))
                    
                    # Now process each tool call and add tool responses
                    for i, tool_call in enumerate(tool_calls):
                        tool_name = tool_call["function"]["name"]
                        tool_args = tool_call["function"]["arguments"]
                        
                        # Ensure arguments are a dictionary
                        if isinstance(tool_args, str):
                            try:
                                tool_args = json.loads(tool_args)
                                logger.info(f"Tool call {i}: Parsed string arguments to dict for {tool_name}")
                            except json.JSONDecodeError as e:
                                logger.error(f"Tool call {i}: Failed to parse arguments for {tool_name}: {e}")
                                logger.error(f"Raw arguments: {tool_args}")
                                tool_args = {}
                        
                        logger.info(f"Tool call {i}: Executing {tool_name} with args: {tool_args}")
                        
                        # Execute the tool
                        tool = tool_registry.get_tool(
                            tool_name,
                            api_key=os.environ.get("TAVILY_API_KEY") if tool_name == "tavily_search" else None
                        )
                        
                        if tool:
                            try:
                                result = await tool.execute(**tool_args)
                                logger.info(f"Tool call {i}: {tool_name} executed successfully")
                                tool_results.append({
                                    "tool_name": tool_name,
                                    "input": tool_args,
                                    "output": result
                                })
                                
                                # Add tool result to messages
                                messages.append(Message(
                                    role="tool",
                                    content=json.dumps(result),
                                    tool_call_id=tool_call["id"]
                                ))
                            except Exception as e:
                                logger.error(f"Tool call {i}: {tool_name} execution failed: {str(e)}")
                                tool_results.append({
                                    "tool_name": tool_name,
                                    "input": tool_args,
                                    "error": str(e)
                                })
                                messages.append(Message(
                                    role="tool",
                                    content=json.dumps({"error": str(e)}),
                                    tool_call_id=tool_call["id"]
                                ))
                    
                    # Get final response after tool execution
                    final_response = await adapter.chat(
                        messages,
                        model=request.model,
                        temperature=request.temperature,
                        max_tokens=request.max_tokens
                    )
                    
                    return {
                        "response": final_response,
                        "tool_calls": tool_results
                    }
                else:
                    return {"response": response}
            else:
                # Regular chat without tools
                response = await adapter.chat(
                    messages,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens
                )
                return {"response": response}
        except Exception as e:
            logger.error(f"Chat completion error: {str(e)}")
            logger.error(f"Request details - Provider: {request.provider}, Model: {request.model}, Enable tools: {request.enable_tools}")
            
            # Log the full error details for debugging
            if hasattr(e, '__class__'):
                logger.error(f"Error type: {e.__class__.__name__}")
            
            # Try to extract more details from httpx errors
            error_details = str(e)
            if hasattr(e, 'response'):
                try:
                    if hasattr(e.response, 'text'):
                        error_details = e.response.text
                    elif hasattr(e.response, 'content'):
                        error_details = e.response.content.decode('utf-8')
                    logger.error(f"HTTP Response body: {error_details}")
                except:
                    pass
            
            # If tools were enabled and we got a 400 error, try without tools
            if request.enable_tools and ("400" in str(e) or "does not support" in error_details):
                logger.warning("Tool call failed with 400 error, retrying without tools")
                logger.warning(f"Error details: {error_details}")
                try:
                    # Use only the original messages without tool-related ones
                    original_messages = [
                        Message(role=msg.role, content=msg.content or "") 
                        for msg in request.messages
                    ]
                    response = await adapter.chat(
                        original_messages,
                        temperature=request.temperature,
                        max_tokens=request.max_tokens
                    )
                    return {"response": response, "tool_error": "This model does not support tool calling. Response generated without tools."}
                except Exception as retry_error:
                    logger.error(f"Retry without tools also failed: {str(retry_error)}")
            
            raise HTTPException(
                status_code=500,
                detail=f"Chat completion failed: {str(e)}"
            )


async def stream_benchmark_events(
    request: BenchRequest
) -> AsyncGenerator[str, None]:
    """Stream benchmark events as NDJSON"""
    try:
        async for event in run_benchmark(request):
            yield json.dumps(event) + "\n"
    except Exception as e:
        error_event = {
            "event_type": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
        yield json.dumps(error_event) + "\n"


@app.post("/api/benchmark")
async def benchmark(
    request: BenchRequest,
    openai_key: str | None = Header(None, alias="X-OpenAI-API-Key"),
    anthropic_key: str | None = Header(None, alias="X-Anthropic-API-Key"),
    deepseek_key: str | None = Header(None, alias="X-DeepSeek-API-Key"),
    tavily_key: str | None = Header(None, alias="X-Tavily-API-Key"),
    ollama_url: str | None = Header(None, alias="X-Ollama-URL")
):
    """
    Run benchmark pipeline and stream NDJSON events
    """
    # Set API keys from headers if provided and not empty
    if openai_key and openai_key != "empty":
        os.environ["OPENAI_API_KEY"] = openai_key
    if anthropic_key and anthropic_key != "empty":
        os.environ["ANTHROPIC_API_KEY"] = anthropic_key
    if deepseek_key and deepseek_key != "empty":
        os.environ["DEEPSEEK_API_KEY"] = deepseek_key
    if tavily_key and tavily_key != "empty":
        os.environ["TAVILY_API_KEY"] = tavily_key
    if ollama_url and ollama_url != "empty":
        os.environ["OLLAMA_URL"] = ollama_url
    
    return StreamingResponse(
        stream_benchmark_events(request),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff"
        }
    )


@app.post("/api/generate-testset")
async def generate_testset(
    request: TestsetGenerationRequest,
    openai_key: str | None = Header(None, alias="X-OpenAI-API-Key"),
    anthropic_key: str | None = Header(None, alias="X-Anthropic-API-Key"),
    deepseek_key: str | None = Header(None, alias="X-DeepSeek-API-Key"),
    ollama_url: str | None = Header(None, alias="X-Ollama-URL")
):
    """
    Generate test questions using AI based on the provided parameters
    """
    # Set API keys from headers if provided
    if openai_key and openai_key != "empty":
        os.environ["OPENAI_API_KEY"] = openai_key
    if anthropic_key and anthropic_key != "empty":
        os.environ["ANTHROPIC_API_KEY"] = anthropic_key
    if deepseek_key and deepseek_key != "empty":
        os.environ["DEEPSEEK_API_KEY"] = deepseek_key
    if ollama_url and ollama_url != "empty":
        os.environ["OLLAMA_URL"] = ollama_url
    
    # Use provider and model from request if specified
    adapter = None
    
    if request.provider and request.model:
        # User specified both provider and model
        adapter_class = ADAPTERS.get(request.provider)
        if adapter_class:
            try:
                adapter = adapter_class(model=request.model)
            except Exception as e:
                logger.warning(f"Failed to initialize {request.provider} with model {request.model}: {e}")
    
    # Fallback to automatic selection if no adapter or not specified
    if not adapter:
        # Try OpenAI first, then Anthropic if available
        if os.getenv("OPENAI_API_KEY"):
            try:
                # Use GPT-4 for better quality generation
                adapter = OpenAIAdapter(model="gpt-4")
            except:
                try:
                    # Fallback to GPT-3.5 if GPT-4 not available
                    adapter = OpenAIAdapter(model="gpt-3.5-turbo")
                except:
                    pass
        
        if not adapter and os.getenv("ANTHROPIC_API_KEY"):
            try:
                # Use Claude 3 Sonnet for cost-effective generation
                adapter = AnthropicAdapter(model="claude-3-sonnet-20240229")
            except:
                try:
                    # Fallback to Claude 3 Haiku
                    adapter = AnthropicAdapter(model="claude-3-haiku-20240307")
                except:
                    pass
        
        if not adapter and os.getenv("DEEPSEEK_API_KEY"):
            try:
                adapter = DeepSeekAdapter(model="deepseek-chat")
            except:
                pass
        
        if not adapter and os.getenv("OLLAMA_URL"):
            try:
                adapter = OllamaAdapter(model="llama2")
            except:
                pass
    
    if not adapter:
        raise HTTPException(
            status_code=401,
            detail="No valid API key found. Please provide an API key for your chosen provider."
        )
    
    # Build the prompt
    if request.testFormatOutput and request.outputFormat:
        # Format-specific test questions
        format_examples = {
            "json": '{"name": "John", "age": 30, "city": "New York"}',
            "csv": 'Name,Age,City\nJohn,30,New York',
            "xml": '<person><name>John</name><age>30</age><city>New York</city></person>',
            "yaml": 'name: John\nage: 30\ncity: New York',
            "markdown": '| Name | Age | City |\n|------|-----|------|\n| John | 30  | New York |',
            "list": '- Item 1\n- Item 2\n- Item 3',
            "numbered": '1. First item\n2. Second item\n3. Third item',
            "sql": 'SELECT name, age FROM users WHERE city = "New York";',
            "code": 'def factorial(n):\n    return 1 if n <= 1 else n * factorial(n-1)'
        }
        
        format_description = request.outputFormat if request.outputFormat not in format_examples else f"{request.outputFormat} (example: {format_examples.get(request.outputFormat, '')})"
        
        prompt = f"""Generate {request.numQuestions} test questions about "{request.topic}" that require responses in {format_description} format.

Requirements:
- Each line must be a valid JSON object in JSONL format
- Required fields: "id" (string), "content" (string with the question)
- The "content" field MUST explicitly ask for the answer in {request.outputFormat} format
- Include "expected_answer" field with a properly formatted example answer in {request.outputFormat}
- Optional fields: "category" (string), "difficulty" (string)
- Difficulty level: {request.difficulty}
- Questions should test both knowledge of {request.topic} AND ability to format responses correctly"""
    else:
        # Regular test questions
        prompt = f"""Generate {request.numQuestions} test questions about "{request.topic}" in JSONL format.

Requirements:
- Each line must be a valid JSON object
- Required fields: "id" (string), "content" (string with the question)
- Optional fields: "expected_answer" (string), "category" (string), "difficulty" (string)
- Difficulty level: {request.difficulty}"""

    if request.categories:
        prompt += f"\n- Include these categories: {request.categories}"
    
    if request.customInstructions:
        prompt += f"\n\nAdditional instructions: {request.customInstructions}"
    
    if request.testFormatOutput:
        prompt += f"""\n\nExample format:
{{"id": "1", "content": "List the main components of {request.topic} in JSON format with 'name' and 'description' fields", "expected_answer": "[{{\\"name\\": \\"Component1\\", \\"description\\": \\"Description1\\"}}]", "category": "formatting", "difficulty": "medium"}}
{{"id": "2", "content": "Create a {request.outputFormat} representation of the key features of {request.topic}", "expected_answer": "<formatted_example>", "category": "formatting", "difficulty": "medium"}}"""
    else:
        prompt += """\n\nExample format:
{"id": "1", "content": "What is the capital of France?", "expected_answer": "Paris", "category": "geography", "difficulty": "easy"}
{"id": "2", "content": "Explain the concept of recursion", "expected_answer": "A programming technique where a function calls itself", "category": "programming", "difficulty": "medium"}"""
    
    prompt += "\n\nGenerate the questions now (JSONL format only, no extra text):"

    try:
        # Generate the testset
        messages = [Message(role="user", content=prompt)]
        response = await adapter.chat(messages, temperature=0.7, max_tokens=2000)
        
        # Clean the response - extract only JSONL lines
        lines = response.strip().split('\n')
        jsonl_lines = []
        
        for line in lines:
            line = line.strip()
            if line.startswith('{') and line.endswith('}'):
                try:
                    # Validate it's valid JSON
                    json.loads(line)
                    jsonl_lines.append(line)
                except:
                    continue
        
        if not jsonl_lines:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate valid JSONL format"
            )
        
        return {"testset": '\n'.join(jsonl_lines)}
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Generation failed: {str(e)}"
        )