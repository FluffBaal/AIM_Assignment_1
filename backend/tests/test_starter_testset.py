"""Tests for starter test set."""
import json
from pathlib import Path
import pytest


class TestStarterTestset:
    """Test the starter test set file."""
    
    def test_starter_testset_exists(self):
        """Test that starter-testset.jsonl exists."""
        testset_path = Path(__file__).parent.parent.parent / "frontend/public/starter-testset.jsonl"
        assert testset_path.exists(), f"starter-testset.jsonl not found at {testset_path}"
    
    def test_starter_testset_has_20_prompts(self):
        """Test that starter test set has exactly 20 prompts."""
        testset_path = Path(__file__).parent.parent.parent / "frontend/public/starter-testset.jsonl"
        
        with open(testset_path, 'r') as f:
            lines = f.readlines()
        
        # Count non-empty lines
        prompts = [line for line in lines if line.strip()]
        assert len(prompts) == 20, f"Expected 20 prompts, found {len(prompts)}"
    
    def test_starter_testset_valid_jsonl(self):
        """Test that each line is valid JSON."""
        testset_path = Path(__file__).parent.parent.parent / "frontend/public/starter-testset.jsonl"
        
        with open(testset_path, 'r') as f:
            lines = f.readlines()
        
        for i, line in enumerate(lines):
            if line.strip():  # Skip empty lines
                try:
                    data = json.loads(line)
                    # Verify required fields
                    assert "id" in data, f"Line {i+1}: Missing 'id' field"
                    assert "content" in data, f"Line {i+1}: Missing 'content' field"
                    assert "category" in data, f"Line {i+1}: Missing 'category' field"
                    assert "difficulty" in data, f"Line {i+1}: Missing 'difficulty' field"
                except json.JSONDecodeError as e:
                    pytest.fail(f"Line {i+1} is not valid JSON: {e}")
    
    def test_starter_testset_unique_ids(self):
        """Test that all prompt IDs are unique."""
        testset_path = Path(__file__).parent.parent.parent / "frontend/public/starter-testset.jsonl"
        
        ids = []
        with open(testset_path, 'r') as f:
            for line in f:
                if line.strip():
                    data = json.loads(line)
                    ids.append(data["id"])
        
        assert len(ids) == len(set(ids)), "Duplicate IDs found in starter test set"
    
    def test_starter_testset_valid_difficulties(self):
        """Test that all difficulties are valid."""
        testset_path = Path(__file__).parent.parent.parent / "frontend/public/starter-testset.jsonl"
        
        valid_difficulties = {"easy", "medium", "hard"}
        
        with open(testset_path, 'r') as f:
            for i, line in enumerate(f):
                if line.strip():
                    data = json.loads(line)
                    difficulty = data.get("difficulty", "")
                    assert difficulty in valid_difficulties, \
                        f"Line {i+1}: Invalid difficulty '{difficulty}', must be one of {valid_difficulties}"
    
    def test_starter_testset_categories(self):
        """Test that categories are diverse."""
        testset_path = Path(__file__).parent.parent.parent / "frontend/public/starter-testset.jsonl"
        
        categories = set()
        with open(testset_path, 'r') as f:
            for line in f:
                if line.strip():
                    data = json.loads(line)
                    categories.add(data["category"])
        
        # Should have at least 5 different categories for diversity
        assert len(categories) >= 5, f"Only {len(categories)} categories found, need at least 5 for diversity"
    
    def test_starter_testset_content_not_empty(self):
        """Test that all prompts have non-empty content."""
        testset_path = Path(__file__).parent.parent.parent / "frontend/public/starter-testset.jsonl"
        
        with open(testset_path, 'r') as f:
            for i, line in enumerate(f):
                if line.strip():
                    data = json.loads(line)
                    content = data.get("content", "").strip()
                    assert content, f"Line {i+1}: Prompt content is empty"
                    assert len(content) >= 10, f"Line {i+1}: Prompt content too short (< 10 chars)"