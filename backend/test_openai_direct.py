#!/usr/bin/env python3
"""
Direct test of OpenAI API to debug 429 errors
"""
import asyncio
import httpx
import json
import sys
import os

async def test_openai_api(api_key: str):
    """Test OpenAI API directly"""
    print(f"Testing OpenAI API with key: {api_key[:7]}...{api_key[-4:]}")
    
    # Test 1: List models
    print("\n1. Testing /v1/models endpoint...")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=30.0
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Found {len(data.get('data', []))} models")
                # Look for gpt-4.1-nano
                for model in data.get('data', []):
                    if 'gpt-4.1' in model.get('id', ''):
                        print(f"   - {model['id']}")
            else:
                print(f"   Error: {response.text}")
        except Exception as e:
            print(f"   Exception: {e}")
    
    # Test 2: Simple chat completion
    print("\n2. Testing /v1/chat/completions endpoint...")
    async with httpx.AsyncClient() as client:
        try:
            data = {
                "model": "gpt-3.5-turbo",  # Use a known working model first
                "messages": [{"role": "user", "content": "Say hello"}],
                "max_tokens": 10,
                "temperature": 0.7
            }
            print(f"   Request: {json.dumps(data, indent=2)}")
            
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json=data,
                timeout=30.0
            )
            print(f"   Status: {response.status_code}")
            print(f"   Headers: {dict(response.headers)}")
            if response.status_code == 200:
                result = response.json()
                print(f"   Response: {result['choices'][0]['message']['content']}")
            else:
                print(f"   Error: {response.text}")
        except Exception as e:
            print(f"   Exception: {e}")
    
    # Test 3: Try gpt-4.1-nano specifically
    print("\n3. Testing gpt-4.1-nano model...")
    async with httpx.AsyncClient() as client:
        try:
            data = {
                "model": "gpt-4.1-nano",
                "messages": [{"role": "user", "content": "Say hello"}],
                "max_tokens": 10,
                "temperature": 0.7
            }
            
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json=data,
                timeout=30.0
            )
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"   Response: {result['choices'][0]['message']['content']}")
            else:
                print(f"   Error: {response.text}")
        except Exception as e:
            print(f"   Exception: {e}")

if __name__ == "__main__":
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key and len(sys.argv) > 1:
        api_key = sys.argv[1]
    
    if not api_key:
        print("Usage: python test_openai_direct.py <api_key>")
        print("Or set OPENAI_API_KEY environment variable")
        sys.exit(1)
    
    asyncio.run(test_openai_api(api_key))