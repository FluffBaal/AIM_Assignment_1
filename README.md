# LLM-Bench

[![CI Status](https://github.com/FluffBaal/baconPancake/workflows/CI/badge.svg)](https://github.com/FluffBaal/baconPancake/actions)
[![Deploy Status](https://github.com/FluffBaal/baconPancake/workflows/Deploy/badge.svg)](https://github.com/FluffBaal/baconPancake/actions)

A comprehensive benchmarking and prompt quality testing platform for Large Language Models (LLMs). Test your prompts across multiple providers, evaluate response quality, and leverage integrated tools for enhanced AI interactions.

## 🌐 Live Application

**Production URL**: https://idoai.dev

## 🎯 Key Features

### Core Capabilities
- **Multi-Provider Support**: Test prompts across OpenAI (GPT-4, o1, o3), Anthropic (Claude), DeepSeek, and local Ollama models
- **Prompt Quality Testing**: Evaluate and compare prompt effectiveness across different models
- **Real-time Chat Interface**: Interactive conversations with tool support (web search, math evaluation)
- **Benchmarking Suite**: Systematic evaluation with customizable test sets and scoring
- **Tool Integration**: Tavily web search and math evaluation tools for enhanced responses

### Advanced Features
- **LLM-as-Judge Evaluation**: Use AI models to evaluate response quality
- **Session Persistence**: Automatic saving of chat threads and benchmark results
- **Cost Estimation**: Pre-run cost estimates with warnings for expensive operations
- **Export/Import**: Save and share benchmark configurations and results
- **Real-time Streaming**: NDJSON-based streaming for live benchmark updates

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand
- **Backend**: FastAPI (Python), Async/await architecture
- **Deployment**: Vercel (frontend), Vercel Serverless (backend)
- **Storage**: IndexedDB for client-side persistence

## Project Structure

```
/
├── backend/        # FastAPI Python backend
│   ├── adapters/   # LLM provider adapters
│   ├── tools/      # Function calling tools
│   └── tests/      # Backend test suite
├── frontend/       # Next.js TypeScript frontend  
│   ├── components/ # React components
│   ├── hooks/      # Custom React hooks
│   └── utils/      # Utility functions
├── docs/           # Project documentation
│   ├── adr/        # Architecture Decision Records
│   └── changelog/  # Phase-by-phase changelogs
├── scripts/        # Build and utility scripts
└── .github/        # GitHub workflows and templates
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm (or npm)
- Python 3.9+ (for local backend development)
- API keys for the LLM providers you want to use

### Quick Start - Using the Live App

1. Visit https://idoai.dev
2. Navigate to Settings and add your API keys
3. Start chatting or run benchmarks!

### Local Development

#### Clone and Install

```bash
git clone https://github.com/FluffBaal/baconPancake.git
cd baconPancake

# Install frontend dependencies
cd frontend
pnpm install

# Install backend dependencies (optional for local API development)
cd ../backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Configure API Keys

Create a `.env` file in the project root:

```env
# Required for respective providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...

# Optional
TAVILY_API_KEY=tvly-...  # For web search tool
OLLAMA_BASE_URL=http://localhost:11434  # For local models
```

#### Run Development Servers

```bash
# Terminal 1: Backend (if developing API locally)
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
pnpm dev
```

Visit http://localhost:3000

## 📖 Usage Guide

### Chat Interface

1. **Select Provider & Model**: Choose from OpenAI, Anthropic, DeepSeek, or Ollama
2. **Enable Tools** (optional): Toggle to use web search and math evaluation
3. **Start Chatting**: Type your message and press Enter
4. **Manage Conversations**: Create new threads, switch between conversations, or delete old ones

### Running Benchmarks

1. **Navigate to Benchmark Page**: Click "Benchmark" in the navigation
2. **Configure Test**:
   - Select provider and model
   - Choose evaluator (basic or LLM-as-judge)
   - Enter prompts or use the starter test set
3. **Review Cost Estimate**: Check the estimated API costs before running
4. **Run Benchmark**: Click "Run Benchmark" to start evaluation
5. **View Results**: See real-time results with scores, latency, and responses

### Test Set Editor

1. **Access Editor**: Navigate to "Test Set" page
2. **Create/Edit Prompts**: Write prompts in JSONL format with:
   - `id`: Unique identifier
   - `content`: The prompt text
   - `expected_answer` (optional): For evaluation
   - `metadata` (optional): Enable tools, categories, etc.
3. **Save & Export**: Download your test set for reuse

### API Keys Management

1. **Open Settings**: Click the gear icon or navigate to Settings
2. **Add API Keys**: Enter your provider API keys
3. **Keys are Stored Locally**: All keys are saved in browser localStorage
4. **Test Connection**: Use the test button to verify API access

## 🛠️ Development

### Testing

```bash
# Backend tests
cd backend
pytest

# Frontend linting and type checking
cd frontend
pnpm lint
pnpm type-check
```

### Code Quality

```bash
# Backend formatting
cd backend
black .
ruff check .

# Frontend formatting
cd frontend
pnpm format
```

### Building for Production

```bash
# Frontend build
cd frontend
pnpm build

# Backend is serverless, no build needed
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Troubleshooting

### Common Issues

**"API Key Invalid" Error**
- Ensure your API key is correctly entered in Settings
- Check that the key has the necessary permissions
- Try the "Test API" feature to verify connectivity

**Tool Calls Not Working**
- Ensure you have a Tavily API key for web search
- Check that "Enable Tools" is toggled on
- Some models may not support tool calling

**Favicon Not Showing**
- Clear browser cache (Ctrl+F5)
- Check that you're viewing the production site

## 📄 License

This project is open source. License details to be added.

## 🙏 Acknowledgments

- Built with Next.js, FastAPI, and Tailwind CSS
- Powered by OpenAI, Anthropic, DeepSeek, and Ollama
- Web search provided by Tavily

---

For detailed documentation, architecture decisions, and development history, see the [docs](docs/) directory.