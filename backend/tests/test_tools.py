"""
Unit tests for tools
"""
import pytest
import httpx
from unittest.mock import AsyncMock, patch
from backend.tools.tavily import TavilySearch
from backend.tools.math import MathTool


@pytest.mark.asyncio
class TestTavilySearch:
    """Test Tavily search tool"""
    
    async def test_search_success(self):
        """Test successful search"""
        tool = TavilySearch(api_key="test-key")
        mock_response = {
            "answer": "The capital of France is Paris",
            "results": [
                {
                    "title": "Paris - Wikipedia",
                    "url": "https://en.wikipedia.org/wiki/Paris",
                    "content": "Paris is the capital of France...",
                    "score": 0.95
                }
            ]
        }
        
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.return_value = AsyncMock(
                json=lambda: mock_response,
                raise_for_status=lambda: None
            )
            
            result = await tool.execute("capital of France")
            
            assert result["query"] == "capital of France"
            assert result["answer"] == "The capital of France is Paris"
            assert len(result["results"]) == 1
            assert result["results"][0]["title"] == "Paris - Wikipedia"
    
    async def test_search_no_api_key(self):
        """Test search without API key"""
        tool = TavilySearch(api_key=None)
        
        result = await tool.execute("test query")
        
        assert "error" in result
        assert "No Tavily API key" in result["error"]
        assert result["results"] == []
    
    async def test_search_http_error(self):
        """Test search with HTTP error"""
        tool = TavilySearch(api_key="test-key")
        
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.side_effect = httpx.HTTPError("Connection failed")
            
            result = await tool.execute("test query")
            
            assert "error" in result
            assert "HTTP error occurred" in result["error"]
            assert result["results"] == []


@pytest.mark.asyncio
class TestMathTool:
    """Test math evaluation tool"""
    
    async def test_basic_arithmetic(self):
        """Test basic arithmetic operations"""
        tool = MathTool()
        
        test_cases = [
            ("2 + 2", 4),
            ("10 - 5", 5),
            ("3 * 4", 12),
            ("15 / 3", 5.0),
            ("2 ** 3", 8),
            ("10 % 3", 1),
            ("-5", -5),
            ("+5", 5),
        ]
        
        for expression, expected in test_cases:
            result = await tool.execute(expression)
            assert result["expression"] == expression
            assert result["result"] == expected
            assert "error" not in result
    
    async def test_allowed_functions(self):
        """Test allowed built-in functions"""
        tool = MathTool()
        
        test_cases = [
            ("abs(-10)", 10),
            ("round(3.7)", 4),
            ("min(1, 2, 3)", 1),
            ("max(1, 2, 3)", 3),
            ("sum([1, 2, 3])", 6),
            ("len([1, 2, 3])", 3),
        ]
        
        for expression, expected in test_cases:
            result = await tool.execute(expression)
            assert result["result"] == expected
    
    async def test_complex_expressions(self):
        """Test complex expressions"""
        tool = MathTool()
        
        result = await tool.execute("(2 + 3) * 4 - 10 / 2")
        assert result["result"] == 15.0
        
        result = await tool.execute("sum([1, 2, 3]) * max(4, 5)")
        assert result["result"] == 30
    
    async def test_division_by_zero(self):
        """Test division by zero error"""
        tool = MathTool()
        
        result = await tool.execute("10 / 0")
        assert "error" in result
        assert "Math error" in result["error"]
        assert result["result"] is None
    
    async def test_unsafe_operations(self):
        """Test that unsafe operations are blocked"""
        tool = MathTool()
        
        unsafe_expressions = [
            "__import__('os').system('ls')",
            "eval('2+2')",
            "open('file.txt')",
            "print('hello')",
        ]
        
        for expression in unsafe_expressions:
            result = await tool.execute(expression)
            assert "error" in result
            assert result["result"] is None
    
    async def test_list_and_tuple_support(self):
        """Test list and tuple evaluation"""
        tool = MathTool()
        
        result = await tool.execute("[1, 2, 3]")
        assert result["result"] == [1, 2, 3]
        
        result = await tool.execute("(1, 2, 3)")
        assert result["result"] == (1, 2, 3)