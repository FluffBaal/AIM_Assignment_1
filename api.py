"""
Entry point for Vercel deployment
"""
import os
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

try:
    # Import the FastAPI app from backend
    from main import app
    
    # Add some debugging
    print(f"Successfully imported FastAPI app")
    print(f"Backend path: {backend_path}")
    print(f"Python path: {sys.path}")
    
except Exception as e:
    print(f"Error importing FastAPI app: {e}")
    print(f"Backend path: {backend_path}")
    print(f"Python path: {sys.path}")
    
    # Create a simple error app
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    
    app = FastAPI()
    
    # Add CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.get("/api/health")
    async def health():
        return {
            "status": "error",
            "error": str(e),
            "backend_path": str(backend_path),
            "python_path": sys.path
        }

# Export for Vercel
__all__ = ["app"]