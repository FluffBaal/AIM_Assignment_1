# ADR-0002: Model Adapters and Tools Architecture

## Status
Accepted

## Context
Phase 2 requires implementing adapters for multiple LLM providers (OpenAI, Anthropic, DeepSeek, Ollama) and basic tools (web search, math evaluation). We need a consistent interface for:

- Async communication with different LLM APIs
- Streaming responses for real-time output
- Tool execution for enhanced capabilities
- Testability and mockability for unit tests

Key requirements:
- Support multiple provider APIs with different formats
- Handle both chat completion and streaming modes
- Provide safe execution environment for tools
- Enable easy addition of new providers and tools

## Decision
We will implement:

### Adapter Architecture
1. **Base ModelAdapter Class**
   - Abstract base class defining common interface
   - Methods: `chat()` and `stream()`
   - Handles API key management and configuration
   - Uses Pydantic models for type safety

2. **Provider-Specific Adapters**
   - OpenAI: Standard OpenAI API format
   - Anthropic: Claude API with system message handling
   - DeepSeek: OpenAI-compatible format
   - Ollama: Local model support with custom prompt formatting

3. **Async HTTP Client**
   - Use httpx for async HTTP requests
   - Support for streaming responses
   - Proper timeout and error handling

### Tools Architecture
1. **Base Tool Class**
   - Abstract base class for all tools
   - Single `execute()` method returning structured data
   - Configuration through kwargs

2. **Tavily Search Tool**
   - Simple wrapper around Tavily API
   - Returns structured search results
   - Includes error handling for missing API keys

3. **Math Evaluation Tool**
   - Safe expression evaluation using AST parsing
   - Whitelist of allowed operations and functions
   - Protection against code injection

### Testing Strategy
- Unit tests with httpx mocking
- Async test support with pytest-asyncio
- Mock external API calls
- Test error conditions and edge cases

## Consequences

### Positive
- Consistent interface across all LLM providers
- Easy to add new providers by extending base class
- Type safety with Pydantic models
- Testable design with dependency injection
- Safe tool execution preventing security risks

### Negative
- Additional abstraction layer adds complexity
- Need to maintain compatibility with provider API changes
- Async code requires careful error handling
- Mock-heavy testing may miss integration issues

### Risks
- Provider API changes may break adapters (mitigated by version pinning)
- Rate limiting not implemented yet (to be added in future phase)
- No retry logic for transient failures (to be added)

## Implementation Notes
- All adapters use environment variables for API keys with override options
- Streaming implemented using async generators
- Tools return structured dictionaries for consistent handling
- Tests use mocking to avoid actual API calls

## Future Enhancements
- Add rate limiting and retry logic
- Implement caching for repeated requests
- Add more providers (Cohere, Hugging Face, etc.)
- Expand tool library (code execution, file operations, etc.)

## References
- OpenAI API: https://platform.openai.com/docs/api-reference
- Anthropic API: https://docs.anthropic.com/claude/reference
- httpx Documentation: https://www.python-httpx.org/
- Phase 1 Scaffold: `/docs/adr/0001-scaffold.md`