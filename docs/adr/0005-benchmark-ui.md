# ADR 0005: Benchmark UI Architecture

## Status
Accepted

## Context
We need a user interface for running benchmarks that provides:
- Real-time streaming of benchmark results
- Visual feedback during long-running benchmarks
- Tool call inspection capabilities
- Chain-of-thought visibility toggle
- Performance visualization

## Decision
Implement a two-pane benchmark interface with:

### Layout
- **TwoPane Component**: Split view with configuration (left) and results (right)
- **Responsive Design**: 1/3 - 2/3 split for optimal space usage

### Core Components
1. **ResultTable**: Displays benchmark results with scores, pass/fail, latency
2. **ToolLogDrawer**: Side drawer for inspecting tool calls per prompt
3. **CoTToggle**: Toggle to show/hide model reasoning in results
4. **Sparkline**: Chart.js-based mini visualization for score trends

### Data Flow
- **useBenchmarkRun Hook**: Manages benchmark state and NDJSON streaming
- **NDJSON Utilities**: Parse streaming responses with proper error handling
- **Real-time Updates**: Results populate as events stream in

### Technical Choices
- **Chart.js**: Lightweight, performant charting library
- **Streaming Fetch**: Native browser APIs for NDJSON consumption
- **Cypress**: E2E testing with mock backend responses

## Consequences

### Positive
- Real-time feedback improves user experience
- Modular components enable reuse
- Tool inspection aids debugging
- CoT toggle balances detail vs overview

### Negative
- Chart.js adds bundle size (~200KB)
- Streaming complexity vs batch updates
- Cypress adds dev dependency weight

## Implementation Notes
- Components use client-side rendering ('use client')
- NDJSON parser handles partial chunks gracefully
- Cypress tests run headless in CI
- Error boundaries prevent stream failures from crashing UI