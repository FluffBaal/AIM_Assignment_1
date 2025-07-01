"""
Unit tests for model adapters
"""
import pytest
import httpx
from unittest.mock import AsyncMock, patch
from backend.adapters import Message
from backend.adapters.openai import OpenAIAdapter
from backend.adapters.anthropic import AnthropicAdapter
from backend.adapters.deepseek import DeepSeekAdapter
from backend.adapters.ollama import OllamaAdapter


@pytest.mark.asyncio
class TestOpenAIAdapter:
    """Test OpenAI adapter"""
    
    async def test_chat_success(self):
        """Test successful chat completion"""
        adapter = OpenAIAdapter(api_key="test-key")
        mock_response = {
            "choices": [{
                "message": {"content": "Hello, world!"}
            }]
        }
        
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.return_value = AsyncMock(
                json=lambda: mock_response,
                raise_for_status=lambda: None
            )
            
            messages = [Message(role="user", content="Hello")]
            result = await adapter.chat(messages)
            
            assert result == "Hello, world!"
            mock_post.assert_called_once()
    
    async def test_stream_success(self):
        """Test successful streaming"""
        adapter = OpenAIAdapter(api_key="test-key")
        
        async def mock_aiter_lines():
            yield 'data: {"choices":[{"delta":{"content":"Hello"}}]}'
            yield 'data: {"choices":[{"delta":{"content":" world"}}]}'
            yield 'data: [DONE]'
        
        with patch("httpx.AsyncClient.stream") as mock_stream:
            mock_response = AsyncMock()
            mock_response.aiter_lines = mock_aiter_lines
            mock_response.raise_for_status = lambda: None
            mock_stream.return_value.__aenter__.return_value = mock_response
            
            messages = [Message(role="user", content="Hello")]
            chunks = []
            async for chunk in adapter.stream(messages):
                chunks.append(chunk)
            
            assert chunks == ["Hello", " world"]


@pytest.mark.asyncio
class TestAnthropicAdapter:
    """Test Anthropic adapter"""
    
    async def test_chat_with_system_message(self):
        """Test chat with system message"""
        adapter = AnthropicAdapter(api_key="test-key")
        mock_response = {
            "content": [{"text": "I understand the system message"}]
        }
        
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.return_value = AsyncMock(
                json=lambda: mock_response,
                raise_for_status=lambda: None
            )
            
            messages = [
                Message(role="system", content="You are helpful"),
                Message(role="user", content="Hello")
            ]
            result = await adapter.chat(messages)
            
            assert result == "I understand the system message"
            
            # Verify the system message was extracted
            call_args = mock_post.call_args[1]["json"]
            assert call_args["system"] == "You are helpful"
            assert len(call_args["messages"]) == 1


@pytest.mark.asyncio
class TestDeepSeekAdapter:
    """Test DeepSeek adapter"""
    
    async def test_chat_success(self):
        """Test successful chat completion"""
        adapter = DeepSeekAdapter(api_key="test-key")
        mock_response = {
            "choices": [{
                "message": {"content": "DeepSeek response"}
            }]
        }
        
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.return_value = AsyncMock(
                json=lambda: mock_response,
                raise_for_status=lambda: None
            )
            
            messages = [Message(role="user", content="Test")]
            result = await adapter.chat(messages)
            
            assert result == "DeepSeek response"


@pytest.mark.asyncio
class TestOllamaAdapter:
    """Test Ollama adapter"""
    
    async def test_chat_format_conversion(self):
        """Test message format conversion for Ollama"""
        adapter = OllamaAdapter(model="llama2")
        mock_response = {"response": "Ollama response"}
        
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.return_value = AsyncMock(
                json=lambda: mock_response,
                raise_for_status=lambda: None
            )
            
            messages = [
                Message(role="system", content="Be helpful"),
                Message(role="user", content="Hello"),
                Message(role="assistant", content="Hi there"),
                Message(role="user", content="How are you?")
            ]
            result = await adapter.chat(messages)
            
            assert result == "Ollama response"
            
            # Verify prompt format
            call_args = mock_post.call_args[1]["json"]
            expected_prompt = (
                "System: Be helpful\n\n"
                "User: Hello\n\n"
                "Assistant: Hi there\n\n"
                "User: How are you?\n\n"
                "Assistant: "
            )
            assert call_args["prompt"] == expected_prompt
    
    async def test_stream_parsing(self):
        """Test stream response parsing"""
        adapter = OllamaAdapter(model="llama2")
        
        async def mock_aiter_lines():
            yield '{"response":"Hello"}'
            yield '{"response":" world","done":false}'
            yield '{"response":"!","done":true}'
        
        with patch("httpx.AsyncClient.stream") as mock_stream:
            mock_response = AsyncMock()
            mock_response.aiter_lines = mock_aiter_lines
            mock_response.raise_for_status = lambda: None
            mock_stream.return_value.__aenter__.return_value = mock_response
            
            messages = [Message(role="user", content="Hello")]
            chunks = []
            async for chunk in adapter.stream(messages):
                chunks.append(chunk)
            
            assert chunks == ["Hello", " world", "!"]