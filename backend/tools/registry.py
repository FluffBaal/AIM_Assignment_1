"""
Tool registry for managing available tools
"""
from typing import Dict, Any, Optional, Type
from . import Tool
from .tavily import TavilySearch
from .math import MathTool


class ToolRegistry:
    """Registry for available tools"""
    
    def __init__(self):
        self.tools: Dict[str, Type[Tool]] = {}
        self._register_default_tools()
    
    def _register_default_tools(self):
        """Register built-in tools"""
        self.register("tavily_search", TavilySearch)
        self.register("math_eval", MathTool)
    
    def register(self, name: str, tool_class: Type[Tool]):
        """Register a tool"""
        self.tools[name] = tool_class
    
    def get_tool(self, name: str, **kwargs) -> Optional[Tool]:
        """Get an instance of a tool"""
        tool_class = self.tools.get(name)
        if tool_class:
            return tool_class(**kwargs)
        return None
    
    def get_tool_definitions(self) -> list[Dict[str, Any]]:
        """Get OpenAI-style function definitions for all tools"""
        definitions = []
        
        # Tavily search tool
        if "tavily_search" in self.tools:
            definitions.append({
                "type": "function",
                "function": {
                    "name": "tavily_search",
                    "description": "Search the web for current information using Tavily API",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query"
                            },
                            "max_results": {
                                "type": "integer",
                                "description": "Maximum number of results to return",
                                "default": 5
                            }
                        },
                        "required": ["query"]
                    }
                }
            })
        
        # Math evaluation tool
        if "math_eval" in self.tools:
            definitions.append({
                "type": "function",
                "function": {
                    "name": "math_eval",
                    "description": "Evaluate mathematical expressions safely",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "expression": {
                                "type": "string",
                                "description": "The mathematical expression to evaluate"
                            }
                        },
                        "required": ["expression"]
                    }
                }
            })
        
        return definitions


# Global registry instance
tool_registry = ToolRegistry()