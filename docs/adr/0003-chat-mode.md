# ADR-0003: Chat Mode Implementation

## Status
Accepted

## Context
Phase 3 requires implementing a streaming chat interface that allows users to interact with multiple LLM providers through a unified UI. Key requirements include:

- Real-time streaming responses from LLM providers
- Multiple conversation threads with persistence
- Clean, intuitive chat interface similar to ChatGPT
- Support for all providers implemented in Phase 2

The implementation needs to balance simplicity with functionality, providing a good user experience while maintaining clean architecture.

## Decision
We will implement:

### Backend Architecture
1. **Streaming Chat Endpoint**
   - POST `/api/chat` with Pydantic validation
   - StreamingResponse for real-time token delivery
   - Support for both streaming and non-streaming modes
   - Unified interface across all providers

2. **Request/Response Schema**
   - ChatRequest: messages, provider, model, temperature, max_tokens, stream flag
   - Structured error responses with detail
   - Provider-agnostic message format

### Frontend Architecture
1. **React Hook Pattern**
   - `useChatThread`: Manages thread state and streaming
   - Local state management (no external state library yet)
   - Optimistic UI updates for better UX

2. **Component Structure**
   - ChatWindow: Main chat interface with message display
   - ThreadList: Sidebar for conversation management
   - Minimal shadcn/ui components for consistent styling

3. **Streaming Implementation**
   - Fetch API with streaming response handling
   - Progressive text rendering as tokens arrive
   - Error boundaries for failed streams

### Testing Strategy
- Backend: Unit tests with mocked adapters
- Frontend: Playwright E2E tests for user workflows
- Focus on critical paths: send message, see response, manage threads

## Consequences

### Positive
- Clean separation between UI and API logic
- Provider-agnostic frontend (easy to add new providers)
- Real-time feedback improves user experience
- Thread management allows complex conversations
- Type safety throughout with TypeScript and Pydantic

### Negative
- Local state management may not scale (can add Zustand later)
- No message persistence yet (threads lost on refresh)
- Basic error handling (can be enhanced)
- No authentication or user management

### Risks
- Streaming complexity may cause debugging challenges
- CORS issues between frontend and backend ports
- Rate limiting not implemented (provider limits may be hit)

## Implementation Notes
- Frontend runs on port 3000, backend on port 8000
- CORS middleware configured for local development
- CSS variables for theming support light/dark modes
- Playwright tests require both services running

## Future Enhancements
- Add message persistence with database
- Implement conversation search
- Add model selection UI
- Support for images and file attachments
- Export conversation history

## References
- Phase 2 Adapters: `/docs/adr/0002-adapters.md`
- Streaming Responses: https://developer.mozilla.org/en-US/docs/Web/API/Streams_API
- shadcn/ui: https://ui.shadcn.com/