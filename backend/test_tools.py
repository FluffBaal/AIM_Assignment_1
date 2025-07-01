#!/usr/bin/env python3
"""
Test script to verify tool calling in benchmark
"""
import asyncio
import json
import os
from benchmark import run_benchmark
from models import BenchRequest, BenchmarkPrompt

async def test_benchmark_with_tools():
    """Test benchmark with tools enabled"""
    
    # Set up a test API key (you'll need a real one for actual testing)
    # os.environ["TAVILY_API_KEY"] = "your-tavily-api-key"
    
    # Create test request
    request = BenchRequest(
        name="Tool Test",
        provider="openai",
        model="gpt-3.5-turbo",
        prompts=[
            BenchmarkPrompt(
                id="1",
                content="What is the current weather in San Francisco?",
                metadata={"enable_tools": True}
            ),
            BenchmarkPrompt(
                id="2", 
                content="Search for the latest news about AI developments",
                metadata={"enable_tools": True}
            )
        ],
        eval_type="basic",
        eval_config={
            "enable_tools": True  # Global setting
        }
    )
    
    print("Running benchmark with tools enabled...")
    print(f"Request: {request.model_dump_json(indent=2)}")
    
    # Run benchmark
    events = []
    async for event in run_benchmark(request):
        print(f"Event: {json.dumps(event, indent=2)}")
        events.append(event)
    
    # Check results
    tool_events = [e for e in events if e.get("event_type") == "tool"]
    print(f"\nTool events found: {len(tool_events)}")
    
    for event in tool_events:
        print(f"Tool: {event.get('tool_name')} - Result: {event.get('tool_result')}")

if __name__ == "__main__":
    asyncio.run(test_benchmark_with_tools())