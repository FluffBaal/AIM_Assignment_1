# ADR 0007: UX Polish and Documentation

## Status
Accepted

## Context
Phase 7 focuses on improving user experience and documentation:
1. Cost estimation before benchmark runs
2. Better error handling with retry capabilities
3. Comprehensive README documentation
4. Developer setup guides

## Decision

### Cost Estimation
- **Component**: `CostMeter.tsx` displays estimated API costs
- **Token Rates**: Hardcoded rates for major providers
- **Estimation**: Conservative token estimates (50 input, 100-500 output)
- **Warnings**: Alert when estimated cost exceeds $1

### Error Handling
- **Component**: `ErrorBanner.tsx` for consistent error display
- **Retry Logic**: Built-in retry button for failed operations
- **User Feedback**: Clear error messages with actionable next steps

### Documentation Structure
Enhanced README with:
- Quick start guides for both backend and frontend
- Usage section with step-by-step instructions
- Local development workflow
- Troubleshooting common issues
- Environment variable reference

### Architecture Guard Enhancement
- Added check for README "Usage" section
- Ensures documentation stays comprehensive

## Consequences

### Positive
- Better user understanding of costs before running benchmarks
- Improved error recovery reduces frustration
- Comprehensive documentation lowers barrier to entry
- Clear development workflows for contributors

### Negative
- Hardcoded token rates require manual updates
- Cost estimates are approximations only
- Documentation requires ongoing maintenance

## Implementation Notes
1. CostMeter updates reactively to provider/model changes
2. ErrorBanner is reusable across different error contexts
3. README follows standard OSS documentation patterns
4. Architecture guard enforces documentation standards