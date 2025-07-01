"""Benchmark pipeline models."""
from datetime import datetime
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field


class BenchmarkPrompt(BaseModel):
    """A single prompt to evaluate."""
    id: str = Field(..., description="Unique identifier for the prompt")
    content: str = Field(..., description="The prompt text")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class BenchRequest(BaseModel):
    """Request to run a benchmark."""
    name: str = Field(..., description="Benchmark run name")
    provider: Literal["openai", "anthropic", "deepseek", "ollama"] = Field(...)
    model: str = Field(..., description="Model name/identifier")
    prompts: List[BenchmarkPrompt] = Field(..., min_length=1)
    eval_type: Literal["basic", "llm_as_judge", "custom"] = Field(default="basic")
    eval_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    system_prompt: Optional[str] = Field(None, description="System prompt to use for all test prompts")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "name": "Math reasoning test",
                "provider": "openai",
                "model": "gpt-3.5-turbo",
                "prompts": [
                    {"id": "1", "content": "What is 2+2?"},
                    {"id": "2", "content": "Solve: x^2 - 4 = 0"}
                ],
                "eval_type": "basic"
            }
        }
    }


class EvalResult(BaseModel):
    """Result of evaluating a single response."""
    prompt_id: str = Field(..., description="ID of the evaluated prompt")
    score: float = Field(..., ge=0.0, le=1.0, description="Score between 0 and 1")
    passed: bool = Field(..., description="Whether the evaluation passed")
    details: Optional[Dict[str, Any]] = Field(default_factory=dict)
    error: Optional[str] = Field(None, description="Error message if evaluation failed")


class BenchmarkEvent(BaseModel):
    """Base class for benchmark events."""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    event_type: str
    
    model_config = {
        "json_encoders": {
            datetime: lambda v: v.isoformat()
        }
    }


class AnswerEvent(BenchmarkEvent):
    """Model response event."""
    event_type: Literal["answer"] = "answer"
    prompt_id: str
    prompt_hash: str = Field(..., description="SHA256 hash of the prompt")
    content: str
    model: str
    provider: str
    tokens_used: Optional[int] = None
    latency_ms: Optional[float] = None


class EvalEvent(BenchmarkEvent):
    """Evaluation result event."""
    event_type: Literal["eval"] = "eval"
    prompt_id: str
    result: EvalResult


class ToolEvent(BenchmarkEvent):
    """Tool call event."""
    event_type: Literal["tool"] = "tool"
    prompt_id: str
    tool_name: str
    tool_args: Dict[str, Any]
    tool_result: Optional[Any] = None
    error: Optional[str] = None


class SummaryEvent(BenchmarkEvent):
    """Benchmark run summary."""
    event_type: Literal["summary"] = "summary"
    total_prompts: int
    passed: int
    failed: int
    average_score: float
    total_duration_ms: float
    errors: List[str] = Field(default_factory=list)