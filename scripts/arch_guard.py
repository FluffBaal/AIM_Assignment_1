#!/usr/bin/env python3
"""
Architecture Guard Script
Verifies project structure compliance
"""
import os
import sys
from pathlib import Path

def check_phase_0_structure():
    """Verify Phase 0 requirements"""
    required_dirs = [
        "backend",
        "frontend", 
        "docs/adr",
        "docs/changelog",
        "scripts",
        ".github/workflows"
    ]
    
    required_files = [
        "docs/spec.md",
        "docs/adr/0000-spec-lock.md",
        ".gitignore",
        "README.md"
    ]
    
    errors = []
    
    for dir_path in required_dirs:
        if not Path(dir_path).is_dir():
            errors.append(f"Missing required directory: {dir_path}")
    
    for file_path in required_files:
        if not Path(file_path).is_file():
            errors.append(f"Missing required file: {file_path}")
    
    # Check README has Usage section
    if Path("README.md").is_file():
        with open("README.md", "r") as f:
            content = f.read()
            if "## Usage" not in content:
                errors.append("README.md must contain '## Usage' section")
    
    return errors

def check_phase_1_structure():
    """Verify Phase 1 requirements"""
    required_files = [
        "backend/main.py",
        "backend/requirements.txt",
        "frontend/package.json",
        ".env.example",
        "docs/adr/0001-scaffold.md"
    ]
    
    errors = []
    
    for file_path in required_files:
        if not Path(file_path).is_file():
            errors.append(f"Missing required file: {file_path}")
    
    # Check if backend main.py has the app variable
    if Path("backend/main.py").is_file():
        with open("backend/main.py", "r") as f:
            content = f.read()
            if "app = FastAPI" not in content:
                errors.append("backend/main.py must define 'app' as FastAPI instance")
    
    return errors

def check_phase_2_structure():
    """Verify Phase 2 requirements"""
    required_adapters = [
        "backend/adapters/__init__.py",
        "backend/adapters/openai.py",
        "backend/adapters/anthropic.py",
        "backend/adapters/deepseek.py",
        "backend/adapters/ollama.py"
    ]
    
    required_tools = [
        "backend/tools/__init__.py",
        "backend/tools/tavily.py",
        "backend/tools/math.py"
    ]
    
    required_tests = [
        "backend/tests/__init__.py",
        "backend/tests/test_adapters.py",
        "backend/tests/test_tools.py"
    ]
    
    required_files = [
        "docs/adr/0002-adapters.md"
    ]
    
    errors = []
    
    # Check adapters
    for file_path in required_adapters:
        if not Path(file_path).is_file():
            errors.append(f"Missing required adapter: {file_path}")
    
    # Check tools
    for file_path in required_tools:
        if not Path(file_path).is_file():
            errors.append(f"Missing required tool: {file_path}")
    
    # Check tests
    for file_path in required_tests:
        if not Path(file_path).is_file():
            errors.append(f"Missing required test: {file_path}")
    
    # Check other files
    for file_path in required_files:
        if not Path(file_path).is_file():
            errors.append(f"Missing required file: {file_path}")
    
    return errors

def check_phase_3_structure():
    """Verify Phase 3 requirements"""
    required_backend_files = [
        "backend/schemas.py",
        "backend/tests/test_chat_api.py"
    ]
    
    required_frontend_files = [
        "frontend/components/ChatWindow.tsx",
        "frontend/components/ThreadList.tsx",
        "frontend/utils/stream.ts",
        "frontend/tests/chat.spec.ts"
    ]
    
    required_files = [
        "docs/adr/0003-chat-mode.md"
    ]
    
    errors = []
    
    # Check backend files
    for file_path in required_backend_files:
        if not Path(file_path).is_file():
            errors.append(f"Missing required backend file: {file_path}")
    
    # Check frontend files
    for file_path in required_frontend_files:
        if not Path(file_path).is_file():
            errors.append(f"Missing required frontend file: {file_path}")
    
    # Check other files
    for file_path in required_files:
        if not Path(file_path).is_file():
            errors.append(f"Missing required file: {file_path}")
    
    # Check if ChatWindow component exists and exports properly
    if Path("frontend/components/ChatWindow.tsx").is_file():
        with open("frontend/components/ChatWindow.tsx", "r") as f:
            content = f.read()
            if "export function ChatWindow" not in content:
                errors.append("ChatWindow component must be exported")
    
    # Check if chat endpoint exists
    if Path("backend/main.py").is_file():
        with open("backend/main.py", "r") as f:
            content = f.read()
            if "/api/chat" not in content:
                errors.append("backend/main.py must define /api/chat endpoint")
    
    return errors

def check_phase_4_structure():
    """Verify Phase 4 requirements"""
    required_files = [
        "backend/models.py",
        "backend/benchmark.py",
        "backend/tests/test_benchmark.py",
        "backend/tests/fixtures/sample_run.ndjson",
        "docs/adr/0004-benchmark-core.md"
    ]
    
    errors = []
    
    # Check required files
    for file_path in required_files:
        if not Path(file_path).is_file():
            errors.append(f"Missing required file: {file_path}")
    
    # Check if benchmark endpoint exists
    if Path("backend/main.py").is_file():
        with open("backend/main.py", "r") as f:
            content = f.read()
            if "/api/benchmark" not in content:
                errors.append("backend/main.py must define /api/benchmark endpoint")
    
    # Check if models.py has required classes
    if Path("backend/models.py").is_file():
        with open("backend/models.py", "r") as f:
            content = f.read()
            required_models = ["BenchRequest", "EvalResult", "AnswerEvent", "EvalEvent", "SummaryEvent"]
            for model in required_models:
                if f"class {model}" not in content:
                    errors.append(f"backend/models.py must define {model} class")
    
    # Check if benchmark.py has run_benchmark function
    if Path("backend/benchmark.py").is_file():
        with open("backend/benchmark.py", "r") as f:
            content = f.read()
            if "async def run_benchmark" not in content:
                errors.append("backend/benchmark.py must define run_benchmark async function")
    
    # Validate sample NDJSON
    if Path("backend/tests/fixtures/sample_run.ndjson").is_file():
        import json
        try:
            with open("backend/tests/fixtures/sample_run.ndjson", "r") as f:
                for i, line in enumerate(f):
                    json.loads(line.strip())
        except json.JSONDecodeError as e:
            errors.append(f"Invalid NDJSON in sample_run.ndjson at line {i+1}: {e}")
    
    return errors

def check_phase_5_structure():
    """Verify Phase 5 requirements"""
    required_components = [
        "frontend/components/ResultTable.tsx",
        "frontend/components/ToolLogDrawer.tsx",
        "frontend/components/CoTToggle.tsx",
        "frontend/components/Sparkline.tsx",
        "frontend/components/TwoPane.tsx"
    ]
    
    required_files = [
        "frontend/app/benchmark/page.tsx",
        "frontend/hooks/useBenchmarkRun.ts",
        "frontend/utils/ndjson.ts",
        "frontend/cypress/e2e/benchmark.cy.ts",
        "frontend/cypress.config.ts",
        "docs/adr/0005-benchmark-ui.md"
    ]
    
    errors = []
    
    # Check components
    for file_path in required_components:
        if not Path(file_path).is_file():
            errors.append(f"Missing required component: {file_path}")
    
    # Check other files
    for file_path in required_files:
        if not Path(file_path).is_file():
            errors.append(f"Missing required file: {file_path}")
    
    # Check if ResultTable is exported
    if Path("frontend/components/ResultTable.tsx").is_file():
        with open("frontend/components/ResultTable.tsx", "r") as f:
            content = f.read()
            if "export function ResultTable" not in content:
                errors.append("ResultTable component must be exported")
    
    # Check if benchmark page exists
    if Path("frontend/app/benchmark/page.tsx").is_file():
        with open("frontend/app/benchmark/page.tsx", "r") as f:
            content = f.read()
            if "export default" not in content:
                errors.append("Benchmark page must have default export")
    
    return errors

def check_phase_7_structure():
    """Verify Phase 7 requirements"""
    required_files = [
        "frontend/components/CostMeter.tsx",
        "frontend/components/ErrorBanner.tsx",
        "docs/adr/0007-polish.md"
    ]
    
    errors = []
    
    for file_path in required_files:
        if not Path(file_path).is_file():
            errors.append(f"Missing required file: {file_path}")
    
    return errors

def check_phase_8_structure():
    """Verify Phase 8 deployment requirements"""
    required_files = [
        "frontend/vercel.json",
        "backend/fly.toml",
        "backend/Dockerfile",
        ".github/workflows/deploy.yml",
        "docs/adr/0008-deploy.md"
    ]
    
    errors = []
    
    # Check required files
    for file_path in required_files:
        if not Path(file_path).is_file():
            errors.append(f"Missing required file: {file_path}")
    
    # Check README has production URLs
    if Path("README.md").is_file():
        with open("README.md", "r") as f:
            content = f.read()
            if "https://llm-bench.vercel.app" not in content:
                errors.append("README.md must contain production frontend URL")
            if "https://llm-bench-api.fly.dev" not in content:
                errors.append("README.md must contain production backend URL")
    
    # Check deploy workflow has health check
    if Path(".github/workflows/deploy.yml").is_file():
        with open(".github/workflows/deploy.yml", "r") as f:
            content = f.read()
            if 'curl' not in content or '/health' not in content:
                errors.append("deploy.yml must include health endpoint check with curl")
            if '"status":"ok"' not in content:
                errors.append("deploy.yml must verify health endpoint returns 'ok' status")
    
    return errors

def check_phase_6_structure():
    """Verify Phase 6 requirements"""
    required_files = [
        "frontend/public/starter-testset.jsonl",
        "prompts/rubric.md",
        "backend/tests/test_starter_testset.py",
        "docs/adr/0006-baseline-export.md"
    ]
    
    errors = []
    
    # Check required files
    for file_path in required_files:
        if not Path(file_path).is_file():
            errors.append(f"Missing required file: {file_path}")
    
    # Validate starter test set
    testset_path = Path("frontend/public/starter-testset.jsonl")
    if testset_path.is_file():
        import json
        line_count = 0
        try:
            with open(testset_path, 'r') as f:
                for line in f:
                    if line.strip():
                        line_count += 1
                        # Validate JSON structure
                        data = json.loads(line)
                        required_fields = ["id", "content", "category", "difficulty"]
                        for field in required_fields:
                            if field not in data:
                                errors.append(f"starter-testset.jsonl: Missing '{field}' field")
                                break
        except json.JSONDecodeError as e:
            errors.append(f"starter-testset.jsonl: Invalid JSON - {e}")
        
        if line_count != 20:
            errors.append(f"starter-testset.jsonl must have exactly 20 prompts, found {line_count}")
    
    # Check export functionality in benchmark page
    if Path("frontend/app/benchmark/page.tsx").is_file():
        with open("frontend/app/benchmark/page.tsx", "r") as f:
            content = f.read()
            required_functions = ["handleExport", "handleImport", "handleQuickBenchmark"]
            for func in required_functions:
                if func not in content:
                    errors.append(f"Benchmark page must implement {func} function")
    
    # Validate export JSON schema structure
    export_schema_fields = ["metadata", "config", "prompts", "results"]
    if Path("frontend/app/benchmark/page.tsx").is_file():
        with open("frontend/app/benchmark/page.tsx", "r") as f:
            content = f.read()
            if "handleExport" in content:
                for field in export_schema_fields:
                    # Check for field as object key (field:) or string ("field")
                    if f'{field}:' not in content and f'"{field}"' not in content:
                        errors.append(f"Export schema must include '{field}' field")
    
    return errors

def main():
    """Run architecture compliance checks"""
    print("Running architecture guard...")
    
    all_errors = []
    
    # Always check Phase 0
    phase_0_errors = check_phase_0_structure()
    all_errors.extend(phase_0_errors)
    
    # Check Phase 1 if we have Phase 1 files
    if Path("backend/main.py").exists() or Path("frontend/package.json").exists():
        phase_1_errors = check_phase_1_structure()
        all_errors.extend(phase_1_errors)
    
    # Check Phase 2 if we have adapter files
    if Path("backend/adapters").exists() or Path("backend/tools").exists():
        phase_2_errors = check_phase_2_structure()
        all_errors.extend(phase_2_errors)
    
    # Check Phase 3 if we have chat components
    if Path("frontend/components/ChatWindow.tsx").exists() or Path("backend/schemas.py").exists():
        phase_3_errors = check_phase_3_structure()
        all_errors.extend(phase_3_errors)
    
    # Check Phase 4 if we have benchmark files
    if Path("backend/benchmark.py").exists() or Path("backend/models.py").exists():
        phase_4_errors = check_phase_4_structure()
        all_errors.extend(phase_4_errors)
    
    # Check Phase 5 if we have benchmark UI files
    if Path("frontend/components/ResultTable.tsx").exists() or Path("frontend/app/benchmark/page.tsx").exists():
        phase_5_errors = check_phase_5_structure()
        all_errors.extend(phase_5_errors)
    
    # Check Phase 6 if we have baseline export files
    if Path("frontend/public/starter-testset.jsonl").exists() or Path("prompts/rubric.md").exists():
        phase_6_errors = check_phase_6_structure()
        all_errors.extend(phase_6_errors)
    
    # Check Phase 7 if we have polish files
    if Path("frontend/components/CostMeter.tsx").exists() or Path("frontend/components/ErrorBanner.tsx").exists():
        phase_7_errors = check_phase_7_structure()
        all_errors.extend(phase_7_errors)
    
    # Check Phase 8 if we have deployment files
    if Path("frontend/vercel.json").exists() or Path("backend/fly.toml").exists():
        phase_8_errors = check_phase_8_structure()
        all_errors.extend(phase_8_errors)
    
    if all_errors:
        print("\n❌ Architecture guard failed:")
        for error in all_errors:
            print(f"  - {error}")
        return 1
    
    print("✅ Architecture guard passed")
    return 0

if __name__ == "__main__":
    exit(main())