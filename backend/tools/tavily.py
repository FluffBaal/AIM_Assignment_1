"""
Tavily web search tool
"""
import os
from typing import Dict, Any, Optional
import httpx
from . import Tool


class TavilySearch(Tool):
    """Simple wrapper for Tavily search API"""
    
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        super().__init__(**kwargs)
        self.api_key = api_key or os.getenv("TAVILY_API_KEY")
        self.base_url = "https://api.tavily.com/search"
    
    async def execute(self, query: str, max_results: int = 5, **params) -> Dict[str, Any]:
        """
        Execute a web search using Tavily API
        
        Args:
            query: Search query string
            max_results: Maximum number of results to return
            **params: Additional parameters to pass to Tavily
            
        Returns:
            Dict containing search results
        """
        if not self.api_key:
            return {
                "error": "No Tavily API key provided",
                "results": []
            }
        
        search_params = {
            "api_key": self.api_key,
            "query": query,
            "max_results": max_results,
            "search_depth": params.get("search_depth", "basic"),
            "include_images": params.get("include_images", False),
            "include_answer": params.get("include_answer", True)
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.base_url,
                    json=search_params,
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()
                
                return {
                    "query": query,
                    "answer": result.get("answer", ""),
                    "results": [
                        {
                            "title": r.get("title", ""),
                            "url": r.get("url", ""),
                            "content": r.get("content", ""),
                            "score": r.get("score", 0.0)
                        }
                        for r in result.get("results", [])
                    ]
                }
                
        except httpx.HTTPError as e:
            return {
                "error": f"HTTP error occurred: {str(e)}",
                "results": []
            }
        except Exception as e:
            return {
                "error": f"An error occurred: {str(e)}",
                "results": []
            }