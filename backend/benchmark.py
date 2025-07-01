"""Benchmark pipeline implementation."""
import asyncio
import hashlib
import json
import os
import time
from datetime import datetime
from typing import AsyncGenerator, Dict, Any, Optional
import logging

from models import (
    BenchRequest, EvalResult, AnswerEvent, EvalEvent, 
    ToolEvent, SummaryEvent
)
from adapters import get_adapter, Message
from tools.registry import tool_registry

logger = logging.getLogger(__name__)


def compute_prompt_hash(prompt: str) -> str:
    """Compute SHA256 hash of a prompt."""
    return hashlib.sha256(prompt.encode('utf-8')).hexdigest()


async def fix_json_with_retry(
    text: str, 
    max_retries: int = 3,
    adapter: Optional[Any] = None
) -> Optional[Dict[str, Any]]:
    """Try to parse JSON, fixing common issues with LLM help if needed."""
    # First, try direct parsing
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # Try basic fixes
    fixes = [
        lambda t: t.strip(),
        lambda t: t.replace("'", '"'),
        lambda t: t.strip('```json').strip('```'),
        lambda t: '{' + t if not t.strip().startswith('{') else t,
        lambda t: t + '}' if not t.strip().endswith('}') else t,
    ]
    
    for fix in fixes:
        try:
            return json.loads(fix(text))
        except:
            continue
    
    # Use LLM to fix if adapter provided
    if adapter and max_retries > 0:
        for attempt in range(max_retries):
            try:
                fix_prompt = f"""Fix this JSON to be valid. Return ONLY the fixed JSON, no explanation:

{text}

Fixed JSON:"""
                fixed = await adapter.chat([Message(role="user", content=fix_prompt)])
                return json.loads(fixed.strip())
            except Exception as e:
                logger.warning(f"JSON fix attempt {attempt + 1} failed: {e}")
                if attempt == max_retries - 1:
                    return None
    
    return None


async def evaluate_response(
    prompt: str,
    response: str,
    eval_type: str,
    eval_config: Dict[str, Any],
    adapter: Optional[Any] = None,
    expected_answer: Optional[str] = None,
    system_prompt: Optional[str] = None
) -> EvalResult:
    """Evaluate a model response."""
    if eval_type == "basic":
        # Simple length and content check
        score = 1.0 if len(response) > 10 else 0.5
        passed = len(response) > 0
        
        return EvalResult(
            prompt_id="",  # Will be set by caller
            score=score,
            passed=passed,
            details={"length": len(response)}
        )
    
    elif eval_type == "llm_as_judge" and adapter:
        # Use LLM to judge the response
        if expected_answer:
            if system_prompt:
                default_prompt = """
You are an expert evaluator. Score this response based on the following rubric:

System Prompt Given to Model: {system_prompt}
Question: {prompt}
Expected Answer: {expected_answer}
Actual Answer: {response}

Evaluation Criteria:
1. Correctness (30%): How accurate is the answer compared to the expected answer?
2. System Prompt Adherence (20%): Does the response follow the instructions, tone, style, and constraints specified in the system prompt?
3. Format Compliance (20%): If a specific format was requested in the question, does the response follow it exactly?
4. Completeness (15%): Does it address all aspects of the question?
5. Clarity (15%): How clear and well-structured is the response?

Important: 
- Pay special attention to system prompt requirements. If the system prompt specifies a particular tone, style, format, or behavior, verify the response adheres to it.
- Pay attention to format requirements. If the question asks for a specific format (e.g., "return as JSON", "provide in CSV format", "create a markdown table"), verify the response matches that format exactly.

Return JSON: {{"score": <0-1>, "passed": <true/false>, "reason": "<brief reason>", "breakdown": {{"correctness": <0-1>, "system_prompt_adherence": <0-1>, "format_compliance": <0-1>, "completeness": <0-1>, "clarity": <0-1>}}}}
"""
            else:
                default_prompt = """
You are an expert evaluator. Score this response based on the following rubric:

Question: {prompt}
Expected Answer: {expected_answer}
Actual Answer: {response}

Evaluation Criteria:
1. Correctness (35%): How accurate is the answer compared to the expected answer?
2. Format Compliance (25%): If a specific format was requested in the question, does the response follow it exactly?
3. Completeness (20%): Does it address all aspects of the question?
4. Clarity (20%): How clear and well-structured is the response?

Important: Pay special attention to format requirements. If the question asks for a specific format (e.g., "return as JSON", "provide in CSV format", "create a markdown table"), verify the response matches that format exactly. Format errors should significantly reduce the format_compliance score.

Return JSON: {{"score": <0-1>, "passed": <true/false>, "reason": "<brief reason>", "breakdown": {{"correctness": <0-1>, "format_compliance": <0-1>, "completeness": <0-1>, "clarity": <0-1>}}}}
"""
        else:
            if system_prompt:
                default_prompt = """
You are an expert evaluator. Rate this response on a scale of 0-1:

System Prompt Given to Model: {system_prompt}
Question: {prompt}
Answer: {response}

Evaluation Criteria:
1. Quality (40%): Overall quality and appropriateness of the response
2. System Prompt Adherence (30%): Does the response follow the instructions, tone, style, and constraints specified in the system prompt?
3. Completeness (15%): Does it fully address the question?
4. Clarity (15%): How clear and well-structured is the response?

Return JSON: {{"score": <0-1>, "passed": <true/false>, "reason": "<brief reason>", "breakdown": {{"quality": <0-1>, "system_prompt_adherence": <0-1>, "completeness": <0-1>, "clarity": <0-1>}}}}
"""
            else:
                default_prompt = """
Rate this response on a scale of 0-1:
Question: {prompt}
Answer: {response}

Return JSON: {{"score": <0-1>, "passed": <true/false>, "reason": "<brief reason>"}}
"""
        
        judge_prompt = eval_config.get("judge_prompt", default_prompt).format(
            prompt=prompt, 
            response=response,
            expected_answer=expected_answer or "",
            system_prompt=system_prompt or ""
        )
        
        try:
            judge_response = await adapter.chat([Message(role="user", content=judge_prompt)])
            result = await fix_json_with_retry(judge_response, adapter=adapter)
            
            if result:
                return EvalResult(
                    prompt_id="",
                    score=float(result.get("score", 0.5)),
                    passed=bool(result.get("passed", True)),
                    details=result
                )
        except Exception as e:
            logger.error(f"LLM judge failed: {e}")
    
    # Default fallback
    return EvalResult(
        prompt_id="",
        score=0.5,
        passed=True,
        details={"eval_type": eval_type, "fallback": True}
    )


async def run_benchmark(request: BenchRequest) -> AsyncGenerator[Dict[str, Any], None]:
    """Run benchmark pipeline, yielding NDJSON events."""
    start_time = time.time()
    adapter = None
    
    try:
        # Initialize adapter
        AdapterClass = get_adapter(request.provider)
        adapter = AdapterClass(model=request.model)
        
        # Log benchmark configuration
        logger.info(f"Running benchmark with provider={request.provider}, model={request.model}")
        if request.system_prompt:
            logger.info(f"Using system prompt: {request.system_prompt[:100]}..." if len(request.system_prompt) > 100 else f"Using system prompt: {request.system_prompt}")
        
        # Initialize evaluator adapter if using llm_as_judge
        evaluator_adapter = None
        if request.eval_type == "llm_as_judge" and request.eval_config:
            eval_provider = request.eval_config.get("evaluator_provider", request.provider)
            eval_model = request.eval_config.get("evaluator_model", request.model)
            EvaluatorClass = get_adapter(eval_provider)
            evaluator_adapter = EvaluatorClass(model=eval_model)
        
        results = []
        errors = []
        
        for prompt in request.prompts:
            prompt_start = time.time()
            
            try:
                # Generate answer
                messages = []
                # Add system prompt if provided
                if request.system_prompt:
                    messages.append(Message(role="system", content=request.system_prompt))
                messages.append(Message(role="user", content=prompt.content))
                
                # Check if we should enable tools - first check global eval_config, then prompt metadata
                enable_tools = False
                if request.eval_config and request.eval_config.get("enable_tools", False):
                    enable_tools = True
                    logger.info(f"Tools enabled globally from eval_config")
                elif prompt.metadata and prompt.metadata.get("enable_tools", False):
                    enable_tools = True
                    logger.info(f"Tools enabled from prompt metadata")
                
                logger.info(f"Processing prompt {prompt.id}: enable_tools={enable_tools}")
                logger.info(f"Adapter type: {type(adapter).__name__}, has chat_with_tools: {hasattr(adapter, 'chat_with_tools')}")
                
                if enable_tools and hasattr(adapter, 'chat_with_tools'):
                    # Get tool definitions
                    tool_definitions = tool_registry.get_tool_definitions()
                    logger.info(f"Available tools: {[t['function']['name'] for t in tool_definitions]}")
                    
                    # Call with tools
                    logger.info(f"Calling chat_with_tools for prompt {prompt.id}")
                    response, tool_calls = await adapter.chat_with_tools(
                        messages, 
                        tools=tool_definitions,
                        model=request.model
                    )
                    
                    logger.info(f"Got response from chat_with_tools: {response[:100] if response else 'None'}...")
                    logger.info(f"Tool calls received: {len(tool_calls) if tool_calls else 0}")
                    
                    # If tools were called, we need to process them
                    if tool_calls:
                        # Add the assistant's message with tool calls to the conversation
                        assistant_msg = Message(
                            role="assistant",
                            content=response or "",
                            tool_calls=tool_calls
                        )
                        messages.append(assistant_msg)
                        
                        # Process each tool call
                        for tool_call in tool_calls:
                            tool_name = tool_call["function"]["name"]
                            tool_args = tool_call["function"]["arguments"]
                            
                            # Ensure arguments are a dictionary
                            if isinstance(tool_args, str):
                                try:
                                    tool_args = json.loads(tool_args)
                                    logger.info(f"Parsed string arguments to dict for {tool_name}")
                                except json.JSONDecodeError as e:
                                    logger.error(f"Failed to parse tool arguments for {tool_name}: {e}")
                                    logger.error(f"Raw arguments: {tool_args}")
                                    tool_args = {}
                            
                            # Execute the tool
                            tavily_key = os.environ.get("TAVILY_API_KEY")
                            logger.info(f"Getting tool {tool_name}, Tavily API key available: {bool(tavily_key)}")
                            
                            tool = tool_registry.get_tool(
                                tool_name,
                                api_key=tavily_key if tool_name == "tavily_search" else None
                            )
                            
                            tool_result = None
                            tool_error = None
                            
                            if tool:
                                try:
                                    logger.info(f"Executing tool {tool_name} with args: {tool_args}")
                                    tool_result = await tool.execute(**tool_args)
                                    logger.info(f"Tool {tool_name} executed successfully, result: {str(tool_result)[:200]}...")
                                except Exception as e:
                                    tool_error = str(e)
                                    logger.error(f"Tool execution error for {tool_name}: {e}")
                                    logger.error(f"Tool args were: {tool_args}")
                            else:
                                tool_error = f"Tool {tool_name} not found"
                                logger.error(tool_error)
                            
                            # Log tool event
                            tool_event = ToolEvent(
                                prompt_id=prompt.id,
                                tool_name=tool_name,
                                tool_args=tool_args,
                                tool_result=tool_result,
                                error=tool_error
                            )
                            yield tool_event.model_dump(mode='json')
                            
                            # Add tool result to messages for follow-up
                            messages.append(Message(
                                role="tool",
                                content=json.dumps(tool_result) if tool_result else json.dumps({"error": tool_error}),
                                tool_call_id=tool_call["id"]
                            ))
                        
                        # Get final response after tool execution
                        final_response = await adapter.chat(messages, model=request.model)
                        response = final_response
                else:
                    # Regular chat without tools
                    logger.info(f"Using regular chat (no tools) for prompt {prompt.id}. Reason: enable_tools={enable_tools}, has_chat_with_tools={hasattr(adapter, 'chat_with_tools')}")
                    response = await adapter.chat(messages, model=request.model)
                
                # Create answer event
                answer_event = AnswerEvent(
                    prompt_id=prompt.id,
                    prompt_hash=compute_prompt_hash(prompt.content),
                    content=response,
                    model=request.model,
                    provider=request.provider,
                    latency_ms=(time.time() - prompt_start) * 1000
                )
                yield answer_event.model_dump(mode='json')
                
                # Evaluate response
                expected_answer = prompt.metadata.get("expected_answer") if prompt.metadata else None
                eval_result = await evaluate_response(
                    prompt.content,
                    response,
                    request.eval_type,
                    request.eval_config,
                    evaluator_adapter or adapter,
                    expected_answer,
                    request.system_prompt
                )
                eval_result.prompt_id = prompt.id
                
                eval_event = EvalEvent(
                    prompt_id=prompt.id,
                    result=eval_result
                )
                yield eval_event.model_dump(mode='json')
                
                results.append(eval_result)
                
            except Exception as e:
                error_msg = f"Error processing prompt {prompt.id}: {str(e)}"
                logger.error(error_msg)
                errors.append(error_msg)
                
                # Yield error eval event
                eval_result = EvalResult(
                    prompt_id=prompt.id,
                    score=0.0,
                    passed=False,
                    error=str(e)
                )
                eval_event = EvalEvent(
                    prompt_id=prompt.id,
                    result=eval_result
                )
                yield eval_event.model_dump(mode='json')
                results.append(eval_result)
        
        # Generate summary
        passed_count = sum(1 for r in results if r.passed)
        total_score = sum(r.score for r in results)
        
        summary = SummaryEvent(
            total_prompts=len(request.prompts),
            passed=passed_count,
            failed=len(request.prompts) - passed_count,
            average_score=total_score / len(results) if results else 0.0,
            total_duration_ms=(time.time() - start_time) * 1000,
            errors=errors
        )
        yield summary.model_dump(mode='json')
        
    except Exception as e:
        logger.error(f"Benchmark pipeline error: {e}")
        # Yield error summary
        summary = SummaryEvent(
            total_prompts=len(request.prompts),
            passed=0,
            failed=len(request.prompts),
            average_score=0.0,
            total_duration_ms=(time.time() - start_time) * 1000,
            errors=[str(e)]
        )
        yield summary.model_dump(mode='json')