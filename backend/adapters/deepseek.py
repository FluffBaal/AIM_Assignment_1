"""
DeepSeek adapter for chat completions
"""
import os
from typing import AsyncIterator, List, Optional, Dict, Any, Tuple
import httpx
import json
from . import ModelAdapter, Message


class DeepSeekAdapter(ModelAdapter):
    """Adapter for DeepSeek's API (OpenAI compatible)"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "deepseek-chat", **kwargs):
        api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
        if api_key and api_key == "empty":
            api_key = None
        super().__init__(api_key, **kwargs)
        self.model = model
        self.base_url = "https://api.deepseek.com/v1"
        
    async def chat(self, messages: List[Message], **kwargs) -> str:
        """Send a chat completion request to DeepSeek"""
        if not self.api_key:
            raise ValueError("DeepSeek API key is required")
        
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
                    "content": m.content
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
                    "content": m.content
                })
        
        data = {
            "model": kwargs.get("model", self.model),
            "messages": formatted_messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 1000)
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=data,
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """Fetch available models from DeepSeek"""
        if not self.api_key:
            raise ValueError("DeepSeek API key is required")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/models",
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            data = response.json()
            
            # Extract models from OpenAI-compatible response
            models = []
            for model in data.get("data", []):
                model_id = model.get("id", "")
                models.append({
                    "id": model_id,
                    "name": model_id.replace("-", " ").title(),
                    "owned_by": model.get("owned_by", "deepseek")
                })
            
            return models
    
    async def stream(self, messages: List[Message], **kwargs) -> AsyncIterator[str]:
        """Stream a chat completion response from DeepSeek"""
        if not self.api_key:
            raise ValueError("DeepSeek API key is required")
        
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
    
    async def chat_with_tools(self, messages: List[Message], tools: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Tuple[str, List[Dict[str, Any]]]:
        """Send a chat completion request with tool support"""
        if not self.api_key:
            raise ValueError("DeepSeek API key is required")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Use same formatting as chat method
        formatted_messages = []
        for m in messages:
            if m.role == "tool":
                formatted_messages.append({
                    "role": "tool",
                    "content": m.content,
                    "tool_call_id": m.tool_call_id
                })
            elif m.role == "assistant" and m.tool_calls:
                msg = {
                    "role": "assistant",
                    "content": m.content
                }
                if m.tool_calls:
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
                    "content": m.content
                })
        
        data = {
            "model": kwargs.get("model", self.model),
            "messages": formatted_messages,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 1000)
        }
        
        # Add tools if provided
        if tools:
            data["tools"] = tools
            data["tool_choice"] = "auto"
        
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
                        tool_calls_made.append({
                            "id": tool_call["id"],
                            "type": tool_call["type"],
                            "function": {
                                "name": tool_call["function"]["name"],
                                "arguments": json.loads(tool_call["function"]["arguments"])
                            }
                        })
                
                return content, tool_calls_made
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise Exception("Invalid API key. Please check your DeepSeek API key in Settings.")
            else:
                raise
        except Exception as e:
            raise