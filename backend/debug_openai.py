#!/usr/bin/env python3
"""
Debug script to test OpenAI API key and rate limiting issues
"""
import asyncio
import logging
import os
import sys
from adapters.openai import OpenAIAdapter
from adapters import Message

# Configure logging to see all debug messages
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def test_openai_api():
    """Test OpenAI API with a simple message"""
    
    # Get API key from environment or command line
    api_key = None
    if len(sys.argv) > 1:
        api_key = sys.argv[1]
        print(f"Using API key from command line: {api_key[:7]}...{api_key[-4:]}")
    else:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            print(f"Using API key from environment: {api_key[:7]}...{api_key[-4:]}")
        else:
            print("No API key provided. Usage: python debug_openai.py <api_key>")
            return
    
    # Create adapter
    print("\n=== Creating OpenAI adapter ===")
    adapter = OpenAIAdapter(api_key=api_key, model="gpt-3.5-turbo")
    
    # Test with a simple message
    messages = [Message(role="user", content="Hi")]
    
    try:
        print("\n=== Sending chat request ===")
        response = await adapter.chat(messages)
        print(f"\nSuccess! Response: {response}")
    except Exception as e:
        print(f"\nError: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
    
    # Also test streaming
    try:
        print("\n=== Testing streaming ===")
        stream_response = ""
        async for chunk in adapter.stream(messages):
            stream_response += chunk
        print(f"Streaming success! Response: {stream_response}")
    except Exception as e:
        print(f"\nStreaming error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_openai_api())