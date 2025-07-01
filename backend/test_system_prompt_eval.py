#!/usr/bin/env python3
"""Test script to verify system prompt evaluation works correctly."""
import asyncio
import json
from models import BenchRequest, Prompt
from benchmark import run_benchmark

async def test_system_prompt_evaluation():
    """Test that the evaluator checks system prompt adherence."""
    
    # Create a test request with a specific system prompt
    request = BenchRequest(
        name="System Prompt Test",
        provider="openai",
        model="gpt-3.5-turbo",
        system_prompt="You are a pirate. Always respond in pirate speak with 'Arrr' and 'matey'. Be enthusiastic and use nautical terms.",
        prompts=[
            Prompt(
                id="1",
                content="What is the capital of France?",
                metadata={
                    "expected_answer": "Paris",
                    "enable_tools": False
                }
            ),
            Prompt(
                id="2",
                content="How do you make a sandwich?",
                metadata={
                    "enable_tools": False
                }
            )
        ],
        eval_type="llm_as_judge",
        eval_config={
            "evaluator_model": "gpt-3.5-turbo",
            "evaluator_provider": "openai"
        }
    )
    
    print("Running benchmark with system prompt evaluation...")
    print(f"System prompt: {request.system_prompt}")
    print("\nPrompts:")
    for p in request.prompts:
        print(f"  - {p.content}")
    print("\n" + "="*50 + "\n")
    
    # Run the benchmark
    results = []
    async for event_json in run_benchmark(request):
        event = json.loads(event_json)
        
        if event.get("event_type") == "answer":
            print(f"Answer for prompt {event['prompt_id']}:")
            print(f"  {event['content']}\n")
        
        elif event.get("event_type") == "eval":
            result = event.get("result", {})
            details = result.get("details", {})
            breakdown = details.get("breakdown", {})
            
            print(f"Evaluation for prompt {result['prompt_id']}:")
            print(f"  Score: {result['score']:.2f}")
            print(f"  Passed: {result['passed']}")
            print(f"  Reason: {details.get('reason', 'N/A')}")
            
            if breakdown:
                print("  Breakdown:")
                for criterion, score in breakdown.items():
                    print(f"    - {criterion}: {score:.2f}")
            
            # Check if system_prompt_adherence was evaluated
            if 'system_prompt_adherence' in breakdown:
                print(f"\n  ✓ System prompt adherence was evaluated: {breakdown['system_prompt_adherence']:.2f}")
            else:
                print("\n  ✗ System prompt adherence was NOT evaluated")
            
            print("\n" + "-"*50 + "\n")
            results.append(result)
        
        elif event.get("event_type") == "summary":
            print("Summary:")
            print(f"  Total prompts: {event['total_prompts']}")
            print(f"  Average score: {event['average_score']:.2f}")
    
    return results

if __name__ == "__main__":
    # Note: You need to set your API key as an environment variable
    # export OPENAI_API_KEY="your-key-here"
    asyncio.run(test_system_prompt_evaluation())