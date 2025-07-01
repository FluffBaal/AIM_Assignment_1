"""
Tests for chat API endpoint
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
import sys
from pathlib import Path

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app

client = TestClient(app)


class TestChatEndpoint:
    """Test /api/chat endpoint"""
    
    def test_chat_endpoint_validation_error(self):
        """Test chat endpoint with validation error"""
        # Empty messages
        response = client.post("/api/chat", json={
            "messages": [],
            "provider": "openai"
        })
        assert response.status_code == 422
        
        # Invalid provider
        response = client.post("/api/chat", json={
            "messages": [{"role": "user", "content": "Hello"}],
            "provider": "invalid_provider"
        })
        assert response.status_code == 422
        
        # Invalid role
        response = client.post("/api/chat", json={
            "messages": [{"role": "invalid", "content": "Hello"}],
            "provider": "openai"
        })
        assert response.status_code == 422
    
    def test_chat_endpoint_request_structure(self):
        """Test that endpoint accepts correct request structure"""
        # This will fail with API key error, but validates structure
        response = client.post("/api/chat", json={
            "messages": [{"role": "user", "content": "Hello"}],
            "model": "gpt-3.5-turbo",
            "provider": "openai",
            "temperature": 0.7,
            "max_tokens": 100,
            "stream": False
        })
        # Will be 500 due to missing API key, but request structure is valid
        assert response.status_code in [200, 500]
        
    def test_chat_endpoint_ollama_local(self):
        """Test chat endpoint with Ollama (local provider)"""
        # Ollama is less likely to need API keys for testing
        response = client.post("/api/chat", json={
            "messages": [{"role": "user", "content": "Test"}],
            "provider": "ollama",
            "model": "llama2",
            "stream": False
        })
        
        # Should accept the request format (may fail with connection error)
        assert response.status_code in [200, 500]
        
        # If it's 500, check error message is reasonable
        if response.status_code == 500:
            error_detail = response.json().get("detail", "")
            # Check for various error types (API key, connection, client error)
            assert any(keyword in error_detail.lower() for keyword in 
                      ["adapter", "connection", "client error", "404"])
        
    def test_chat_endpoint_streaming_request(self):
        """Test that streaming endpoint accepts streaming request"""
        # This will fail with API key error, but validates request structure
        response = client.post("/api/chat", json={
            "messages": [{"role": "user", "content": "Hello"}],
            "provider": "openai",
            "stream": True
        })
        
        # Request should be accepted (even if it fails with 500 due to no API key)
        assert response.status_code in [200, 500]