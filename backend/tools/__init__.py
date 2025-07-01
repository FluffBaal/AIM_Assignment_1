"""
Tools for LLM benchmarking
"""
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod


class Tool(ABC):
    """Base class for all tools"""
    
    def __init__(self, **kwargs):
        self.config = kwargs
    
    @abstractmethod
    async def execute(self, **params) -> Dict[str, Any]:
        """Execute the tool with given parameters"""
        pass