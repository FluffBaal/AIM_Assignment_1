"""
OpenAI adapter for chat completions
"""
import os
from typing import AsyncIterator, List, Optional, Dict, Any, Tuple
import httpx
import json
import asyncio
import time
from . import ModelAdapter, Message
import logging

logger = logging.getLogger(__name__)


class OpenAIAdapter(ModelAdapter):
    """Adapter for OpenAI's API"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-3.5-turbo", **kwargs):
        super().__init__(api_key or os.getenv("OPENAI_API_KEY"), **kwargs)
        self.model = model
        self.base_url = "https://api.openai.com/v1"
        
        # Debug logging for API key
        if self.api_key:
            logger.info(f"OpenAI adapter initialized with API key: {self.api_key[:7]}...{self.api_key[-4:] if len(self.api_key) > 11 else ''}")
            logger.info(f"API key format check - starts with 'sk-': {self.api_key.startswith('sk-')}")
            logger.info(f"API key length: {len(self.api_key)} characters")
        else:
            logger.warning("OpenAI adapter initialized without API key")
        
    async def chat(self, messages: List[Message], **kwargs) -> str:
        """Send a chat completion request to OpenAI with retry logic"""
        if not self.api_key:
            logger.error("No API key available for OpenAI adapter!")
            raise ValueError("OpenAI API key is required")
            
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Format messages properly, including tool responses
        formatted_messages = []
        for m in messages:
            if m.role == "tool":
                # Tool messages need special formatting
                formatted_messages.append({
                    "role": "tool",
                    "content": m.content,
                    "tool_call_id": m.tool_call_id
                })
            elif m.role == "assistant" and m.tool_calls:
                # Assistant messages with tool calls
                msg = {
                    "role": "assistant",
                    "content": m.content or None  # OpenAI accepts null content when there are tool_calls
                }
                if m.tool_calls:
                    # Ensure arguments are JSON strings
                    formatted_tool_calls = []
                    for tc in m.tool_calls:
                        formatted_tc = {
                            "id": tc["id"],
                            "type": tc["type"],
                            "function": {
                                "name": tc["function"]["name"],
                                "arguments": json.dumps(tc["function"]["arguments"]) if isinstance(tc["function"]["arguments"], dict) else tc["function"]["arguments"]
                            }
                        }
                        formatted_tool_calls.append(formatted_tc)
                    msg["tool_calls"] = formatted_tool_calls
                formatted_messages.append(msg)
            else:
                formatted_messages.append({
                    "role": m.role,
                    "content": m.content or ""  # Ensure content is never None for regular messages
                })
        
        data = {
            "model": kwargs.get("model", self.model),
            "messages": formatted_messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 1000)
        }
        
        logger.info(f"Sending chat request to OpenAI:")
        logger.info(f"  - Model: {data['model']}")
        logger.info(f"  - Messages: {len(messages)} messages")
        logger.info(f"  - Temperature: {data['temperature']}")
        logger.info(f"  - Max tokens: {data['max_tokens']}")
        logger.info(f"  - URL: {self.base_url}/chat/completions")
        logger.debug(f"  - Full request body: {json.dumps(data, indent=2)}")
        
        max_retries = 5
        base_delay = 2.0
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Attempt {attempt + 1}/{max_retries} - Sending request to OpenAI API")
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers=headers,
                        json=data,
                        timeout=30.0
                    )
                    response.raise_for_status()
                    result = response.json()
                    logger.info(f"Success! Got response from OpenAI")
                    return result["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    # Log detailed error information
                    logger.error(f"Rate limit error (429) on attempt {attempt + 1}/{max_retries}")
                    logger.error(f"Response status: {e.response.status_code}")
                    logger.error(f"Response headers: {dict(e.response.headers)}")
                    # For streaming responses, we need to handle the error differently
                    error_details = "Unable to read error details"
                    try:
                        # The response might already be consumed, so we need to check
                        if hasattr(e.response, 'content'):
                            # For httpx, use content attribute for already read responses
                            error_details = e.response.content.decode('utf-8')
                        elif hasattr(e.response, 'text'):
                            error_details = e.response.text
                        elif hasattr(e.response, 'aread'):
                            error_body = await e.response.aread()
                            error_details = error_body.decode('utf-8')
                    except Exception as err:
                        logger.error(f"Failed to read error body: {err}")
                    logger.error(f"Response body: {error_details}")
                    
                    # Try to parse the error for more details
                    try:
                        error_json = json.loads(error_details)
                        if 'error' in error_json:
                            logger.error(f"OpenAI Error Message: {error_json['error'].get('message', 'Unknown')}")
                            logger.error(f"OpenAI Error Type: {error_json['error'].get('type', 'Unknown')}")
                            logger.error(f"OpenAI Error Code: {error_json['error'].get('code', 'Unknown')}")
                    except:
                        pass
                    
                    if attempt < max_retries - 1:
                        # Extract retry-after header if available
                        retry_after = e.response.headers.get("retry-after")
                        if retry_after:
                            delay = float(retry_after)
                        else:
                            # Exponential backoff: 1s, 2s, 4s
                            delay = base_delay * (2 ** attempt)
                        
                        logger.warning(f"OpenAI rate limit hit (429). Retrying after {delay}s... (attempt {attempt + 1}/{max_retries})")
                        await asyncio.sleep(delay)
                        continue
                    else:
                        raise Exception(f"Rate limit exceeded after {max_retries} retries. Please wait and try again.")
                else:
                    # Safely read error body for both streaming and regular responses
                    error_text = "Unable to read error details"
                    try:
                        if hasattr(e.response, 'aread'):
                            error_body = await e.response.aread()
                            error_text = error_body.decode('utf-8')
                        elif hasattr(e.response, 'text'):
                            error_text = e.response.text
                    except:
                        pass
                    logger.error(f"HTTP error {e.response.status_code}: {error_text}")
                    logger.error(f"Request headers: {headers}")
                    logger.error(f"Request URL: {self.base_url}/chat/completions")
                    logger.error(f"Request body: {json.dumps(data, indent=2)}")
                    
                    # Provide better error messages for common issues
                    if e.response.status_code == 404:
                        model = data.get('model', 'unknown')
                        raise Exception(f"Model '{model}' not found. Please select a valid OpenAI model.")
                    elif e.response.status_code == 401:
                        raise Exception("Invalid API key. Please check your OpenAI API key in Settings.")
                    else:
                        raise
            except Exception:
                raise
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """Fetch available models from OpenAI"""
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/models",
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            data = response.json()
            
            # Log all available models for debugging
            all_models = data.get("data", [])
            logger.info(f"OpenAI API returned {len(all_models)} total models")
            
            # Get all models without filtering - let users see everything available
            chat_models = []
            
            # Only exclude specific deprecated date-based models and embeddings
            excluded_patterns = [
                "0301", "0314", "0613",  # Old deprecated versions
                "embedding",  # Embedding models can't do chat
                "whisper",    # Audio models
                "tts",        # Text-to-speech models
                "dall-e",     # Image models
                "davinci",    # Old completion models
                "curie",      # Old completion models
                "babbage",    # Old completion models
                "ada"         # Old completion models
            ]
            
            for model in all_models:
                model_id = model.get("id", "")
                # Log each model for debugging
                logger.debug(f"Found model: {model_id}")
                
                # Check if it should be excluded
                is_excluded = any(pattern in model_id.lower() for pattern in excluded_patterns)
                
                if not is_excluded:
                    chat_models.append({
                        "id": model_id,
                        "name": model_id.replace("-", " ").title(),
                        "owned_by": model.get("owned_by", "openai")
                    })
                    logger.info(f"Added model: {model_id}")
            
            # If no models found, return defaults
            if not chat_models:
                logger.warning("No chat models found from API, returning defaults")
                chat_models = [
                    {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "owned_by": "openai"},
                    {"id": "gpt-4", "name": "GPT-4", "owned_by": "openai"},
                    {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "owned_by": "openai"},
                    {"id": "gpt-3.5-turbo-16k", "name": "GPT-3.5 Turbo 16K", "owned_by": "openai"},
                ]
            
            return sorted(chat_models, key=lambda x: x["id"])
    
    async def stream(self, messages: List[Message], **kwargs) -> AsyncIterator[str]:
        """Stream a chat completion response from OpenAI with retry logic"""
        if not self.api_key:
            logger.error("No API key available for OpenAI adapter!")
            raise ValueError("OpenAI API key is required")
            
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": kwargs.get("model", self.model),
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 1000),
            "stream": True
        }
        
        logger.info(f"Sending streaming chat request to OpenAI:")
        logger.info(f"  - Model: {data['model']}")
        logger.info(f"  - Messages: {len(messages)} messages")
        logger.info(f"  - Temperature: {data['temperature']}")
        logger.info(f"  - Max tokens: {data['max_tokens']}")
        logger.info(f"  - URL: {self.base_url}/chat/completions")
        
        max_retries = 5
        base_delay = 2.0
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Stream attempt {attempt + 1}/{max_retries} - Sending request to OpenAI API")
                # Log the actual API key being used (masked)
                logger.info(f"Using API key: {self.api_key[:7]}...{self.api_key[-4:] if self.api_key else 'None'}")
                logger.info(f"Full request URL: {self.base_url}/chat/completions")
                logger.info(f"Request model: {data.get('model')}")
                
                async with httpx.AsyncClient() as client:
                    async with client.stream(
                        "POST",
                        f"{self.base_url}/chat/completions",
                        headers=headers,
                        json=data,
                        timeout=30.0
                    ) as response:
                        response.raise_for_status()
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                if line == "data: [DONE]":
                                    break
                                try:
                                    chunk = json.loads(line[6:])
                                    if "choices" in chunk and chunk["choices"]:
                                        delta = chunk["choices"][0].get("delta", {})
                                        if "content" in delta:
                                            yield delta["content"]
                                except json.JSONDecodeError:
                                    continue
                        return  # Success, exit the retry loop
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    # Log detailed error information
                    logger.error(f"Rate limit error (429) on attempt {attempt + 1}/{max_retries}")
                    logger.error(f"Response status: {e.response.status_code}")
                    logger.error(f"Response headers: {dict(e.response.headers)}")
                    # For streaming responses, we need to read the content first
                    try:
                        error_body = await e.response.aread()
                        logger.error(f"Response body: {error_body.decode('utf-8')}")
                    except:
                        logger.error("Could not read error response body")
                    
                    if attempt < max_retries - 1:
                        # Extract retry-after header if available
                        retry_after = e.response.headers.get("retry-after")
                        if retry_after:
                            delay = float(retry_after)
                        else:
                            # Exponential backoff: 1s, 2s, 4s
                            delay = base_delay * (2 ** attempt)
                        
                        logger.warning(f"OpenAI rate limit hit (429). Retrying after {delay}s... (attempt {attempt + 1}/{max_retries})")
                        await asyncio.sleep(delay)
                        continue
                    else:
                        raise Exception(f"Rate limit exceeded after {max_retries} retries. Please wait and try again.")
                else:
                    # Safely read error body for both streaming and regular responses
                    error_text = "Unable to read error details"
                    try:
                        if hasattr(e.response, 'aread'):
                            error_body = await e.response.aread()
                            error_text = error_body.decode('utf-8')
                        elif hasattr(e.response, 'text'):
                            error_text = e.response.text
                    except:
                        pass
                    logger.error(f"HTTP error {e.response.status_code}: {error_text}")
                    logger.error(f"Request headers: {headers}")
                    logger.error(f"Request URL: {self.base_url}/chat/completions")
                    logger.error(f"Request body: {json.dumps(data, indent=2)}")
                    
                    # Provide better error messages for common issues
                    if e.response.status_code == 404:
                        model = data.get('model', 'unknown')
                        raise Exception(f"Model '{model}' not found. Please select a valid OpenAI model.")
                    elif e.response.status_code == 401:
                        raise Exception("Invalid API key. Please check your OpenAI API key in Settings.")
                    else:
                        raise
            except Exception:
                raise
    async def chat_with_tools(self, messages: List[Message], tools: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Tuple[str, List[Dict[str, Any]]]:
        """Send a chat completion request with tool support"""
        if not self.api_key:
            logger.error("No API key available for OpenAI adapter!")
            raise ValueError("OpenAI API key is required")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Format messages properly, including tool responses
        formatted_messages = []
        for m in messages:
            if m.role == "tool":
                # Tool messages need special formatting
                formatted_messages.append({
                    "role": "tool",
                    "content": m.content,
                    "tool_call_id": m.tool_call_id
                })
            elif m.role == "assistant" and m.tool_calls:
                # Assistant messages with tool calls
                msg = {
                    "role": "assistant",
                    "content": m.content or None  # OpenAI accepts null content when there are tool_calls
                }
                if m.tool_calls:
                    # Ensure arguments are JSON strings
                    formatted_tool_calls = []
                    for tc in m.tool_calls:
                        formatted_tc = {
                            "id": tc["id"],
                            "type": tc["type"],
                            "function": {
                                "name": tc["function"]["name"],
                                "arguments": json.dumps(tc["function"]["arguments"]) if isinstance(tc["function"]["arguments"], dict) else tc["function"]["arguments"]
                            }
                        }
                        formatted_tool_calls.append(formatted_tc)
                    msg["tool_calls"] = formatted_tool_calls
                formatted_messages.append(msg)
            else:
                formatted_messages.append({
                    "role": m.role,
                    "content": m.content or ""  # Ensure content is never None for regular messages
                })
        
        model = kwargs.get("model", self.model)
        
        # Check if model supports function calling
        models_without_functions = ["gpt-3.5-turbo-0301", "gpt-4-0314", "gpt-4-32k-0314"]
        
        if model in models_without_functions:
            logger.warning(f"Model {model} does not support function calling. Falling back to regular chat.")
            return await self.chat(messages, **kwargs), []
        
        data = {
            "model": model,
            "messages": formatted_messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 1000)
        }
        
        # Add tools if provided
        if tools:
            data["tools"] = tools
            data["tool_choice"] = "auto"
        
        logger.info(f"Sending chat request with tools to OpenAI:")
        logger.info(f"  - Model: {model}")
        logger.info(f"  - Tools: {len(tools) if tools else 0} tools available")
        logger.info(f"  - Full request URL: {self.base_url}/chat/completions")
        
        # Log the full request for debugging
        try:
            logger.info(f"  - Request data: {json.dumps(data, indent=2)}")
        except Exception as e:
            logger.error(f"  - Failed to log request data: {e}")
            logger.info(f"  - Request keys: {list(data.keys())}")
        
        tool_calls_made = []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=data,
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()
                
                message = result["choices"][0]["message"]
                content = message.get("content", "")
                
                # Check for tool calls
                if "tool_calls" in message and message["tool_calls"]:
                    for tool_call in message["tool_calls"]:
                        # OpenAI returns arguments as a JSON string, parse it to dict
                        parsed_args = json.loads(tool_call["function"]["arguments"])
                        tc = {
                            "id": tool_call["id"],
                            "type": tool_call["type"],
                            "function": {
                                "name": tool_call["function"]["name"],
                                "arguments": parsed_args  # Store as dict
                            }
                        }
                        tool_calls_made.append(tc)
                        logger.info(f"OpenAI tool call: {tc['function']['name']} with args type: {type(tc['function']['arguments'])}")
                    logger.info(f"Model made {len(tool_calls_made)} tool calls")
                
                return content, tool_calls_made
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error in chat_with_tools: {e.response.status_code}")
            try:
                error_body = e.response.text
                logger.error(f"Error response: {error_body}")
                
                # Check for specific error about model not supporting tools
                if e.response.status_code == 400:
                    if "does not support" in error_body:
                        logger.warning(f"Model {model} does not support tools. Falling back to regular chat.")
                        return await self.chat(messages, **kwargs), []
                    elif "arguments" in error_body and "string, but got" in error_body:
                        logger.error("Tool arguments format error detected. This is a bug in our code.")
                        logger.error(f"Tools sent: {json.dumps(tools, indent=2) if tools else 'None'}")
                    else:
                        logger.error(f"Unknown 400 error for model {model}")
            except:
                pass
            if e.response.status_code == 401:
                raise Exception("Invalid API key. Please check your OpenAI API key in Settings.")
            else:
                raise
        except Exception as e:
            logger.error(f"Error in chat_with_tools: {str(e)}")
            raise