"""
Anthropic adapter for chat completions
"""
import os
from typing import AsyncIterator, List, Optional, Dict, Any, Tuple
import httpx
import json
import logging
from . import ModelAdapter, Message

logger = logging.getLogger(__name__)


class AnthropicAdapter(ModelAdapter):
    """Adapter for Anthropic's Claude API"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-sonnet-20240229", **kwargs):
        super().__init__(api_key or os.getenv("ANTHROPIC_API_KEY"), **kwargs)
        self.model = model
        self.base_url = "https://api.anthropic.com/v1"
        
    async def chat(self, messages: List[Message], **kwargs) -> str:
        """Send a chat completion request to Anthropic"""
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        # Convert messages to Anthropic format
        system_message = None
        user_messages = []
        
        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                # For regular chat, only use simple string content
                # Tool messages should not appear in regular chat
                if msg.role in ["user", "assistant"]:
                    user_messages.append({
                        "role": msg.role,
                        "content": msg.content or ""
                    })
        
        data = {
            "model": kwargs.get("model", self.model),
            "messages": user_messages,
            "max_tokens": kwargs.get("max_tokens", 1000),
            "temperature": kwargs.get("temperature", 0.7)
        }
        
        if system_message:
            data["system"] = system_message
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/messages",
                headers=headers,
                json=data,
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()
            return result["content"][0]["text"]
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """Fetch available models from Anthropic"""
        if not self.api_key:
            raise ValueError("Anthropic API key is required")
        
        try:
            # Anthropic has a models endpoint at /v1/models
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.anthropic.com/v1/models",
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01"
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                # Extract all models from response without filtering
                models = []
                for model in data.get("data", []):
                    model_id = model.get("id", "")
                    models.append({
                        "id": model_id,
                        "name": model.get("display_name", model_id.replace("-", " ").title()),
                        "type": model.get("type", ""),
                        "created_at": model.get("created_at", "")
                    })
                
                # Sort by created_at descending (newest first) as per API docs
                models.sort(key=lambda x: x.get("created_at", ""), reverse=True)
                
                return models
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                # If models endpoint doesn't exist, return known models
                logger.warning("Models endpoint not found, returning default Claude models")
                return [
                    {"id": "claude-opus-4", "name": "Claude Opus 4", "type": "chat"},
                    {"id": "claude-sonnet-4", "name": "Claude Sonnet 4", "type": "chat"},
                    {"id": "claude-3.7-sonnet", "name": "Claude 3.7 Sonnet", "type": "chat"},
                    {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "type": "chat"},
                    {"id": "claude-3-sonnet-20240229", "name": "Claude 3 Sonnet", "type": "chat"},
                    {"id": "claude-3-haiku-20240307", "name": "Claude 3 Haiku", "type": "chat"},
                    {"id": "claude-2.1", "name": "Claude 2.1", "type": "chat"},
                    {"id": "claude-2.0", "name": "Claude 2.0", "type": "chat"},
                    {"id": "claude-instant-1.2", "name": "Claude Instant 1.2", "type": "chat"}
                ]
            else:
                raise
    
    async def stream(self, messages: List[Message], **kwargs) -> AsyncIterator[str]:
        """Stream a chat completion response from Anthropic"""
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        # Convert messages to Anthropic format
        system_message = None
        user_messages = []
        
        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            else:
                # For regular streaming, only use simple string content
                # Tool messages should not appear in streaming
                if msg.role in ["user", "assistant"]:
                    user_messages.append({
                        "role": msg.role,
                        "content": msg.content or ""
                    })
        
        data = {
            "model": kwargs.get("model", self.model),
            "messages": user_messages,
            "max_tokens": kwargs.get("max_tokens", 1000),
            "temperature": kwargs.get("temperature", 0.7),
            "stream": True
        }
        
        if system_message:
            data["system"] = system_message
        
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/messages",
                headers=headers,
                json=data,
                timeout=30.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            chunk = json.loads(line[6:])
                            if chunk["type"] == "content_block_delta":
                                yield chunk["delta"]["text"]
                        except json.JSONDecodeError:
                            continue
    
    async def chat_with_tools(self, messages: List[Message], tools: Optional[List[Dict[str, Any]]] = None, **kwargs) -> Tuple[str, List[Dict[str, Any]]]:
        """Send a chat completion request with tool support"""
        if not self.api_key:
            logger.error("No API key available for Anthropic adapter!")
            raise ValueError("Anthropic API key is required")
        
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "tools-2024-05-16",
            "Content-Type": "application/json"
        }
        
        # Convert messages to Anthropic format
        system_message = None
        user_messages = []
        
        for msg in messages:
            if msg.role == "system":
                system_message = msg.content
            elif msg.role == "tool":
                # Add tool result to messages
                user_messages.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": msg.tool_call_id,
                        "content": msg.content
                    }]
                })
            else:
                user_messages.append({
                    "role": "assistant" if msg.role == "assistant" else "user",
                    "content": msg.content or ""
                })
        
        data = {
            "model": kwargs.get("model", self.model),
            "messages": user_messages,
            "max_tokens": kwargs.get("max_tokens", 1000),
            "temperature": kwargs.get("temperature", 0.7)
        }
        
        if system_message:
            data["system"] = system_message
        
        # Convert OpenAI tool format to Anthropic format
        if tools:
            anthropic_tools = []
            for tool in tools:
                if tool["type"] == "function":
                    func = tool["function"]
                    anthropic_tools.append({
                        "name": func["name"],
                        "description": func["description"],
                        "input_schema": func["parameters"]
                    })
            data["tools"] = anthropic_tools
        
        logger.info(f"Sending chat request with tools to Anthropic:")
        logger.info(f"  - Model: {data['model']}")
        logger.info(f"  - Tools: {len(tools) if tools else 0} tools available")
        logger.info(f"  - Beta header: {headers.get('anthropic-beta', 'Not set')}")
        
        # Log the full request for debugging
        try:
            logger.info(f"  - Request data: {json.dumps(data, indent=2)}")
        except Exception as e:
            logger.error(f"  - Failed to log request data: {e}")
        
        tool_calls_made = []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/messages",
                    headers=headers,
                    json=data,
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()
                
                # Extract content and tool calls
                content_parts = []
                for content_block in result["content"]:
                    if content_block["type"] == "text":
                        content_parts.append(content_block["text"])
                    elif content_block["type"] == "tool_use":
                        # Anthropic returns 'input' as a dict, keep it as dict
                        tool_call = {
                            "id": content_block["id"],
                            "type": "function",
                            "function": {
                                "name": content_block["name"],
                                "arguments": content_block["input"]  # Keep as dict
                            }
                        }
                        tool_calls_made.append(tool_call)
                        logger.info(f"Anthropic tool call: {tool_call['function']['name']} with args type: {type(tool_call['function']['arguments'])}")
                
                content = " ".join(content_parts) if content_parts else None
                logger.info(f"Model made {len(tool_calls_made)} tool calls")
                
                return content, tool_calls_made
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error in chat_with_tools: {e.response.status_code}")
            try:
                error_body = e.response.text
                logger.error(f"Error response: {error_body}")
            except:
                pass
            if e.response.status_code == 401:
                raise Exception("Invalid API key. Please check your Anthropic API key in Settings.")
            else:
                raise
        except Exception as e:
            logger.error(f"Error in chat_with_tools: {str(e)}")
            raise