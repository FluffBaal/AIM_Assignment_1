# ADR 0004: Benchmark Core Pipeline

## Status
Accepted

## Context
We need a robust pipeline for running benchmarks that:
- Streams results in real-time as NDJSON events
- Handles various failure modes gracefully
- Provides consistent prompt versioning via SHA256 hashes
- Logs tool calls for analysis
- Supports different evaluation strategies

## Decision
Implement an async generator-based benchmark pipeline that:

1. **Event Streaming**: Uses NDJSON format with typed events (answer, eval, tool, summary)
2. **Prompt Hashing**: SHA256 hashes for consistent prompt versioning
3. **JSON Recovery**: Retry logic with LLM assistance for malformed JSON
4. **Evaluation Modes**: Pluggable evaluation (basic, llm_as_judge, custom)
5. **Error Handling**: Graceful degradation with error events

### Event Types
- `answer`: Model response with hash, latency, tokens
- `eval`: Evaluation result with score and pass/fail
- `tool`: Tool/function call logging
- `summary`: Aggregate statistics and errors

### Key Components
- `backend/benchmark.py`: Core pipeline logic
- `backend/models.py`: Pydantic models for type safety
- `/api/benchmark`: Streaming endpoint

## Consequences
### Positive
- Real-time feedback during benchmark runs
- Robust error handling prevents total failures
- NDJSON format enables easy parsing and storage
- Prompt hashing enables versioning and deduplication

### Negative
- Streaming adds complexity vs batch processing
- JSON fixing may introduce latency
- Tool detection is currently basic (keyword matching)

## Implementation Notes
- Uses FastAPI's `StreamingResponse` for NDJSON delivery
- Adapters are initialized per benchmark run
- Events include timestamps for replay capability