# ADR 0008: Production Deployment

## Status
Accepted

## Context
Phase 8 implements production deployment for the LLM-Bench platform:
1. Frontend deployment to Vercel
2. Backend deployment to Fly.io
3. Automated deployment pipeline via GitHub Actions
4. Health monitoring and verification

## Decision

### Frontend Deployment (Vercel)
- **Platform**: Vercel for Next.js optimization
- **Configuration**: `vercel.json` with build settings
- **Environment**: Production API URL configuration
- **Features**:
  - Automatic HTTPS
  - Global CDN
  - Preview deployments for PRs
  - API rewrites to backend

### Backend Deployment (Fly.io)
- **Platform**: Fly.io for containerized FastAPI
- **Configuration**: `fly.toml` with health checks
- **Container**: Dockerfile with Python 3.11 slim
- **Features**:
  - Auto-scaling (min 1 instance)
  - Health check monitoring
  - Persistent deployment
  - Global anycast routing

### CI/CD Pipeline
GitHub Actions workflow (`deploy.yml`):
1. Triggered on main branch push
2. Deploys frontend to Vercel
3. Deploys backend to Fly.io
4. Verifies health endpoints
5. Ensures "ok" status response

### Security Considerations
- CORS configured for production domains
- HTTPS enforced on both services
- Security headers in Vercel config
- Non-root user in Docker container

## Consequences

### Positive
- Zero-downtime deployments
- Automatic scaling based on load
- Global distribution for low latency
- Integrated monitoring and alerts
- Preview environments for testing

### Negative
- Vendor lock-in (Vercel + Fly.io)
- Separate deployment targets increase complexity
- Cost scales with usage
- Cold starts possible on Fly.io

## Implementation Notes
1. Requires secrets in GitHub:
   - `VERCEL_TOKEN`
   - `FLY_API_TOKEN`
2. Backend must expose `/health` endpoint
3. Frontend proxies `/api/*` to backend
4. Both services use custom domains
5. Deployment verification includes curl health checks