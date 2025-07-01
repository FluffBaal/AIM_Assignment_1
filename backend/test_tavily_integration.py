#!/usr/bin/env python3
"""
Manual test script for Tavily integration
"""
import asyncio
import os
import json
from models import BenchRequest, BenchmarkPrompt
from benchmark import run_benchmark

async def test_tavily_integration():
    """Test Tavily search tool integration"""
    print("Testing Tavily integration...")
    
    # Check if Tavily API key is set
    if not os.environ.get("TAVILY_API_KEY"):
        print("WARNING: TAVILY_API_KEY not set in environment")
        print("Please set: export TAVILY_API_KEY=your_key_here")
        return
    
    # Create a benchmark request with tool-enabled prompts
    request = BenchRequest(
        name="Tavily Integration Test",
        provider="openai",
        model="gpt-3.5-turbo",
        system_prompt="You are a helpful assistant that can search the web when needed.",
        prompts=[
            BenchmarkPrompt(
                id="1",
                content="What is the current weather in San Francisco? Use web search to find real-time information.",
                metadata={"enable_tools": True}
            ),
            BenchmarkPrompt(
                id="2",
                content="Who won the most recent NBA championship? Search for the latest information.",
                metadata={"enable_tools": True}
            ),
            BenchmarkPrompt(
                id="3",
                content="What is 2+2? (This should not require tools)",
                metadata={"enable_tools": False}
            )
        ],
        eval_type="basic"
    )
    
    # Run the benchmark
    print("\nRunning benchmark with tool-enabled prompts...")
    print("-" * 60)
    
    tool_calls = []
    answers = []
    
    async for event in run_benchmark(request):
        event_type = event.get("event_type")
        
        if event_type == "tool":
            # Log tool calls
            tool_name = event.get("tool_name")
            tool_args = event.get("tool_args")
            tool_result = event.get("tool_result")
            error = event.get("error")
            
            tool_calls.append(event)
            
            print(f"\n🔧 Tool Call: {tool_name}")
            print(f"   Args: {json.dumps(tool_args, indent=2)}")
            if error:
                print(f"   ❌ Error: {error}")
            else:
                print(f"   ✅ Result: {json.dumps(tool_result, indent=2)[:200]}...")
        
        elif event_type == "answer":
            # Log answers
            content = event.get("content")
            prompt_id = event.get("prompt_id")
            answers.append(event)
            
            print(f"\n💬 Answer for prompt {prompt_id}:")
            print(f"   {content[:200]}...")
        
        elif event_type == "summary":
            # Log summary
            print("\n" + "=" * 60)
            print("📊 Benchmark Summary:")
            print(f"   Total prompts: {event.get('total_prompts')}")
            print(f"   Passed: {event.get('passed')}")
            print(f"   Failed: {event.get('failed')}")
            print(f"   Average score: {event.get('average_score'):.2f}")
            print(f"   Duration: {event.get('total_duration_ms'):.0f}ms")
            
            if event.get("errors"):
                print(f"   ❌ Errors: {event.get('errors')}")
    
    # Summary of tool usage
    print("\n" + "=" * 60)
    print("🔍 Tool Usage Summary:")
    print(f"   Total tool calls: {len(tool_calls)}")
    print(f"   Successful calls: {sum(1 for t in tool_calls if not t.get('error'))}")
    print(f"   Failed calls: {sum(1 for t in tool_calls if t.get('error'))}")
    
    # Verify expectations
    print("\n✅ Verification:")
    print(f"   Expected 2 tool calls (for prompts 1 & 2): {'PASS' if len(tool_calls) >= 2 else 'FAIL'}")
    print(f"   All answers received: {'PASS' if len(answers) == 3 else 'FAIL'}")

if __name__ == "__main__":
    asyncio.run(test_tavily_integration())