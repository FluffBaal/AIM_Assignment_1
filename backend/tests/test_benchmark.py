"""Tests for benchmark pipeline."""
import json
import pytest
from unittest.mock import Mock, AsyncMock, patch
from models import BenchRequest, BenchmarkPrompt, EvalResult
from benchmark import (
    compute_prompt_hash, fix_json_with_retry, evaluate_response, run_benchmark
)


class TestHashingAndJSON:
    """Test hashing and JSON fixing utilities."""
    
    def test_compute_prompt_hash(self):
        """Test SHA256 hash computation."""
        # Known hash for "What is 2+2?"
        expected = "52cb6b5e4a038af1756708f98afb718a08c75b87b2f03dbee4dd9c8139c15c5e"
        assert compute_prompt_hash("What is 2+2?") == expected
        
        # Hash should be consistent
        prompt = "Hello, world!"
        hash1 = compute_prompt_hash(prompt)
        hash2 = compute_prompt_hash(prompt)
        assert hash1 == hash2
        
        # Different prompts should have different hashes
        assert compute_prompt_hash("prompt1") != compute_prompt_hash("prompt2")
    
    @pytest.mark.asyncio
    async def test_fix_json_basic(self):
        """Test basic JSON fixing."""
        # Valid JSON should pass through
        valid = '{"key": "value"}'
        result = await fix_json_with_retry(valid)
        assert result == {"key": "value"}
        
        # Single quotes should be fixed
        single_quotes = "{'key': 'value'}"
        result = await fix_json_with_retry(single_quotes)
        assert result == {"key": "value"}
        
        # Missing braces - this won't parse as valid JSON
        no_braces = '"key": "value"'
        result = await fix_json_with_retry(no_braces)
        assert result is None  # Should return None without an adapter
        
        # Code block wrapper
        wrapped = '```json\n{"key": "value"}\n```'
        result = await fix_json_with_retry(wrapped)
        assert result == {"key": "value"}
    
    @pytest.mark.asyncio
    async def test_fix_json_with_llm(self):
        """Test JSON fixing with LLM fallback."""
        mock_adapter = Mock()
        mock_adapter.chat = AsyncMock(return_value='{"fixed": true}')
        
        # Badly broken JSON that needs LLM help
        broken = "this is not even close to json"
        result = await fix_json_with_retry(broken, adapter=mock_adapter)
        assert result == {"fixed": True}
        assert mock_adapter.chat.called


class TestEvaluation:
    """Test response evaluation."""
    
    @pytest.mark.asyncio
    async def test_basic_evaluation(self):
        """Test basic evaluation logic."""
        # Short response
        result = await evaluate_response(
            "What is 2+2?",
            "4",
            "basic",
            {}
        )
        assert result.score == 0.5  # Short response gets 0.5
        assert result.passed is True
        
        # Longer response
        result = await evaluate_response(
            "Explain quantum mechanics",
            "Quantum mechanics is a fundamental theory in physics...",
            "basic",
            {}
        )
        assert result.score == 1.0
        assert result.passed is True
    
    @pytest.mark.asyncio
    async def test_llm_judge_evaluation(self):
        """Test LLM-as-judge evaluation."""
        mock_adapter = Mock()
        mock_adapter.chat = AsyncMock(
            return_value='{"score": 0.8, "passed": true, "reason": "Good answer"}'
        )
        
        result = await evaluate_response(
            "What is 2+2?",
            "4",
            "llm_as_judge",
            {},
            adapter=mock_adapter
        )
        assert result.score == 0.8
        assert result.passed is True
        assert "reason" in result.details


class TestBenchmarkPipeline:
    """Test the main benchmark pipeline."""
    
    @pytest.mark.asyncio
    async def test_benchmark_event_order(self):
        """Test that events are generated in correct order."""
        request = BenchRequest(
            name="Test benchmark",
            provider="openai",
            model="gpt-3.5-turbo",
            prompts=[
                BenchmarkPrompt(id="1", content="What is 2+2?"),
                BenchmarkPrompt(id="2", content="What is the capital of France?")
            ]
        )
        
        # Mock adapter
        with patch('benchmark.get_adapter') as mock_get_adapter:
            mock_adapter = Mock()
            mock_adapter.chat = AsyncMock(side_effect=["4", "Paris"])
            mock_get_adapter.return_value = Mock(return_value=mock_adapter)
            
            events = []
            async for event in run_benchmark(request):
                events.append(event)
            
            # Check we got expected number of events
            # 2 prompts × (answer + eval) + 1 summary = 5 events minimum
            assert len(events) >= 5
            
            # Check event types in order
            event_types = [e["event_type"] for e in events]
            assert event_types[0] == "answer"
            assert event_types[1] == "eval"
            assert event_types[-1] == "summary"
            
            # Check summary stats
            summary = events[-1]
            assert summary["total_prompts"] == 2
            assert summary["passed"] == 2
            assert summary["failed"] == 0
    
    @pytest.mark.asyncio
    async def test_benchmark_with_errors(self):
        """Test benchmark handling errors gracefully."""
        request = BenchRequest(
            name="Error test",
            provider="openai",
            model="gpt-3.5-turbo",
            prompts=[
                BenchmarkPrompt(id="1", content="This will fail")
            ]
        )
        
        # Mock adapter that raises error
        with patch('benchmark.get_adapter') as mock_get_adapter:
            mock_adapter = Mock()
            mock_adapter.chat = AsyncMock(side_effect=Exception("API Error"))
            mock_get_adapter.return_value = Mock(return_value=mock_adapter)
            
            events = []
            async for event in run_benchmark(request):
                events.append(event)
            
            # Should still get eval and summary events
            assert len(events) >= 2
            
            # Check eval shows failure
            eval_event = next(e for e in events if e["event_type"] == "eval")
            assert eval_event["result"]["passed"] is False
            assert eval_event["result"]["score"] == 0.0
            
            # Check summary shows failure
            summary = events[-1]
            assert summary["failed"] == 1
            assert summary["passed"] == 0
            assert len(summary["errors"]) > 0
    
    @pytest.mark.asyncio
    async def test_tool_logging(self):
        """Test that tool calls are logged when enable_tools is True."""
        request = BenchRequest(
            name="Tool test",
            provider="openai",
            model="gpt-3.5-turbo",
            prompts=[
                BenchmarkPrompt(
                    id="1", 
                    content="What is the weather in San Francisco?",
                    metadata={"enable_tools": True}
                )
            ]
        )
        
        # Mock adapter with chat_with_tools method
        with patch('benchmark.get_adapter') as mock_get_adapter:
            mock_adapter = Mock()
            mock_adapter.chat_with_tools = AsyncMock(
                return_value=(
                    "The weather in San Francisco is currently sunny with a temperature of 72°F.",
                    [
                        {
                            "id": "tool_123",
                            "type": "function",
                            "function": {
                                "name": "tavily_search",
                                "arguments": {"query": "weather San Francisco", "max_results": 1}
                            }
                        }
                    ]
                )
            )
            mock_adapter.chat = AsyncMock(
                return_value="The weather in San Francisco is currently sunny with a temperature of 72°F."
            )
            mock_get_adapter.return_value = Mock(return_value=mock_adapter)
            
            # Mock tool registry
            with patch('benchmark.tool_registry') as mock_registry:
                mock_tool = Mock()
                mock_tool.execute = AsyncMock(
                    return_value={"results": [{"title": "SF Weather", "content": "Sunny, 72°F"}]}
                )
                mock_registry.get_tool.return_value = mock_tool
                mock_registry.get_tool_definitions.return_value = [
                    {
                        "type": "function",
                        "function": {
                            "name": "tavily_search",
                            "description": "Search the web",
                            "parameters": {}
                        }
                    }
                ]
                
                events = []
                async for event in run_benchmark(request):
                    events.append(event)
                
                # Should have tool events
                tool_events = [e for e in events if e["event_type"] == "tool"]
                assert len(tool_events) == 1
                assert tool_events[0]["tool_name"] == "tavily_search"
                assert tool_events[0]["tool_args"] == {"query": "weather San Francisco", "max_results": 1}
                assert tool_events[0]["tool_result"] == {"results": [{"title": "SF Weather", "content": "Sunny, 72°F"}]}
                assert tool_events[0]["error"] is None