"""
Ollama adapter for local LLM chat completions
"""
import os
from typing import AsyncIterator, List, Optional, Dict, Any
import httpx
import json
from . import ModelAdapter, Message


class OllamaAdapter(ModelAdapter):
    """Adapter for Ollama local models"""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "llama2", base_url: Optional[str] = None, **kwargs):
        super().__init__(api_key, **kwargs)  # Ollama doesn't need API key
        self.model = model
        self.base_url = base_url or os.getenv("OLLAMA_URL", "http://localhost:11434")
        
    async def chat(self, messages: List[Message], **kwargs) -> str:
        """Send a chat completion request to Ollama"""
        # Convert messages to Ollama format
        prompt = ""
        for msg in messages:
            if msg.role == "system":
                prompt += f"System: {msg.content}\n\n"
            elif msg.role == "user":
                prompt += f"User: {msg.content}\n\n"
            else:
                prompt += f"Assistant: {msg.content}\n\n"
        prompt += "Assistant: "
        
        data = {
            "model": kwargs.get("model", self.model),
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": kwargs.get("temperature", 0.7),
                "num_predict": kwargs.get("max_tokens", 1000)
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json=data,
                timeout=60.0  # Ollama can be slower
            )
            response.raise_for_status()
            result = response.json()
            return result["response"]
    
    async def list_models(self) -> List[Dict[str, Any]]:
        """Fetch available models from Ollama"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                data = response.json()
                
                # Extract models from response
                models = []
                for model in data.get("models", []):
                    model_name = model.get("name", "")
                    models.append({
                        "id": model_name,
                        "name": model_name.replace(":", " ").title(),
                        "size": model.get("size", 0),
                        "modified_at": model.get("modified_at", "")
                    })
                
                return models
            except httpx.ConnectError:
                # Ollama not running
                return []
    
    async def stream(self, messages: List[Message], **kwargs) -> AsyncIterator[str]:
        """Stream a chat completion response from Ollama"""
        # Convert messages to Ollama format
        prompt = ""
        for msg in messages:
            if msg.role == "system":
                prompt += f"System: {msg.content}\n\n"
            elif msg.role == "user":
                prompt += f"User: {msg.content}\n\n"
            else:
                prompt += f"Assistant: {msg.content}\n\n"
        prompt += "Assistant: "
        
        data = {
            "model": kwargs.get("model", self.model),
            "prompt": prompt,
            "stream": True,
            "options": {
                "temperature": kwargs.get("temperature", 0.7),
                "num_predict": kwargs.get("max_tokens", 1000)
            }
        }
        
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json=data,
                timeout=60.0
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    try:
                        chunk = json.loads(line)
                        if "response" in chunk:
                            yield chunk["response"]
                        if chunk.get("done", False):
                            break
                    except json.JSONDecodeError:
                        continue