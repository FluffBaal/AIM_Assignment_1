# ADR 0006: Baseline Test Set and Export/Import

## Status
Accepted

## Context
We need:
1. A standardized baseline test set for consistent benchmarking
2. Export functionality to save benchmark results
3. Import functionality to reload previous configurations
4. A rubric for evaluating responses

## Decision

### Baseline Test Set
- **Format**: JSONL (newline-delimited JSON) for streaming compatibility
- **Location**: `frontend/public/starter-testset.jsonl` for easy access
- **Size**: 20 diverse prompts covering multiple categories
- **Structure**: Each line contains `id`, `content`, `category`, `difficulty`

### Export Format
Single JSON file containing:
```json
{
  "metadata": {
    "name": "benchmark name",
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "timestamp": "ISO 8601",
    "total_prompts": 20,
    "passed": 18,
    "failed": 2,
    "average_score": 0.85,
    "total_duration_ms": 15000
  },
  "config": {
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "eval_type": "basic"
  },
  "prompts": [...],
  "results": [...]
}
```

### Import Functionality
- Loads configuration (provider, model)
- Restores prompts to textarea
- Does NOT restore results (requires re-run)
- User notification of successful import

### Evaluation Rubric
- Located at `prompts/rubric.md`
- Defines scoring scale (0.0-1.0)
- Category-specific criteria
- Pass/fail thresholds by difficulty

## Consequences

### Positive
- Consistent baseline for comparing models
- Portable benchmark results
- Reproducible test configurations
- Clear evaluation standards
- Easy sharing of benchmark setups

### Negative
- JSONL requires line-by-line parsing
- Export files can be large with many prompts
- Import doesn't restore results (computational cost)

## Implementation Notes
1. Quick Benchmark button loads and runs starter set
2. Export creates timestamped JSON files
3. Import accepts only `.json` files
4. Pytest validates starter set integrity
5. Frontend fetches JSONL from public directory