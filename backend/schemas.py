"""
Pydantic schemas for API requests and responses
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_length=1)
    model: str = Field(default="gpt-3.5-turbo", description="Model to use for chat")
    provider: Literal["openai", "anthropic", "deepseek", "ollama"] = Field(
        default="openai", 
        description="LLM provider to use"
    )
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=1000, gt=0, le=4000)
    stream: bool = Field(default=True, description="Whether to stream the response")
    enable_tools: bool = Field(default=False, description="Whether to enable tool usage")


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None