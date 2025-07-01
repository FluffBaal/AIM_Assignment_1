"""
Model adapters for various LLM providers
"""
from typing import AsyncIterator, Dict, Any, Optional, List, Type
from abc import ABC, abstractmethod
from pydantic import BaseModel


class Message(BaseModel):
    role: str
    content: Optional[str] = None  # Can be None for assistant messages with tool_calls
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None


class ModelAdapter(ABC):
    """Base class for all model adapters"""
    
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        self.api_key = api_key
        self.config = kwargs
    
    @abstractmethod
    async def chat(self, messages: List[Message], **kwargs) -> str:
        """Send a chat completion request and return the response"""
        pass
    
    @abstractmethod
    async def stream(self, messages: List[Message], **kwargs) -> AsyncIterator[str]:
        """Stream a chat completion response"""
        pass
    
    async def chat_with_tools(self, messages: List[Message], tools: Optional[List[Dict[str, Any]]] = None, **kwargs) -> tuple[str, List[Dict[str, Any]]]:
        """Send a chat completion request with tool support and return response + tool calls"""
        # Default implementation just calls chat without tools
        response = await self.chat(messages, **kwargs)
        return response, []


def get_adapter(provider: str) -> Type[ModelAdapter]:
    """Get adapter class for a provider"""
    from .openai import OpenAIAdapter
    from .anthropic import AnthropicAdapter
    from .deepseek import DeepSeekAdapter
    from .ollama import OllamaAdapter
    
    adapters = {
        "openai": OpenAIAdapter,
        "anthropic": AnthropicAdapter,
        "deepseek": DeepSeekAdapter,
        "ollama": OllamaAdapter
    }
    
    adapter_class = adapters.get(provider)
    if not adapter_class:
        raise ValueError(f"Unknown provider: {provider}")
    
    return adapter_class