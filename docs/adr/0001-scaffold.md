# ADR-0001: Backend and Frontend Scaffold

## Status
Accepted

## Context
Following the completion of Phase 0 (specification lock), we need to establish the technical foundation for both the backend and frontend applications. This includes:

- Setting up a runnable FastAPI backend with basic structure
- Creating a Next.js 14 frontend application with TypeScript
- Establishing development environment configuration
- Ensuring both stacks can be developed and tested independently

Key requirements from the specification:
- Backend: FastAPI with Python 3.11+, PostgreSQL, Redis, Celery
- Frontend: Next.js 14+ with App Router, TypeScript, shadcn/ui, Tailwind CSS
- Both applications must be independently deployable

## Decision
We will create minimal but functional scaffolds for both applications:

### Backend (FastAPI)
- Use FastAPI with standard Uvicorn server
- Implement a basic health check endpoint at `/api/health`
- Include CORS middleware configured for local development
- Use Pydantic for data validation (included by default)
- Structure to support future expansion with adapters, API routes, and models

### Frontend (Next.js)
- Use Next.js 14 with App Router (not Pages Router)
- Enable TypeScript with strict mode
- Include Tailwind CSS for styling foundation
- Use pnpm as the package manager for better monorepo support
- Configure with standard Next.js project structure (no src directory)

### Environment Configuration
- Create `.env.example` with placeholders for:
  - LLM provider API keys (OpenAI, Anthropic)
  - Local LLM configuration (Ollama)
  - Service URLs and ports
  - Future database configuration

### CI/CD Updates
- Extend architecture guard to verify entry points exist
- Add backend and frontend linting to CI pipeline
- Ensure all changes maintain backwards compatibility

## Consequences

### Positive
- Both applications can be started and tested immediately
- Clear separation of concerns between backend and frontend
- Foundation for parallel development in future phases
- Type safety from the start with TypeScript and Pydantic
- Modern tooling choices align with current best practices

### Negative
- Additional complexity from managing two separate applications
- Need to coordinate API contracts between frontend and backend
- Increased CI/CD pipeline complexity

### Risks
- Version mismatches between frontend and backend during development
- CORS configuration may need adjustment for production
- pnpm might have compatibility issues with some tools (mitigated by widespread adoption)

## Implementation Notes
- Backend runs on port 8000 by default
- Frontend runs on port 3000 by default
- Both applications include hot-reload for development
- Future phases will add authentication, database connections, and business logic

## References
- FastAPI Documentation: https://fastapi.tiangolo.com/
- Next.js App Router: https://nextjs.org/docs/app
- Phase 0 Specification: `/docs/spec.md`