# 🚀 CodeFlix Quick Start Guide

## In 30 Seconds

```bash
# 1. Clone and setup
npm install
cp .env.example .env

# 2. Add API keys to .env
# Edit .env and add ONE of: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, GROQ_API_KEY

# 3. Run
npm run dev:all

# 4. Open browser
# Frontend: http://localhost:5173
# Backend: http://localhost:4000
```

---

## Environment Setup

### Quick Dev Setup
```bash
# Copy example config
cp .env.example .env

# Add your API key (choose one provider):
# OpenAI:   OPENAI_API_KEY=sk-proj-...
# Anthropic: ANTHROPIC_API_KEY=sk-ant-...
# Gemini:   GEMINI_API_KEY=...
# Groq:     GROQ_API_KEY=gsk-...
```

### Production Setup
```bash
export NODE_ENV=production
export PORT=8080
export ALLOWED_ORIGINS=https://yourdomain.com
# Add API keys as above
npm run build
npm start
```

---

## Commands

```bash
# Development
npm run dev          # Frontend only (http://localhost:5173)
npm run dev:api      # Backend only (http://localhost:4000)
npm run dev:all      # Both (recommended)

# Production
npm run build        # Build frontend
npm start            # Start backend (requires .env)

# Maintenance
npm run lint         # Check code quality
npm run lint:fix     # Auto-fix linting issues
npm run preview      # Test production build locally

# Docker
docker-compose up    # Start both frontend & backend
docker-compose down  # Stop everything
```

---

## File Structure

```
codeflix/
├── src/                      # Frontend React app
│   ├── components/          # UI components
│   ├── simulations/         # Physics simulations
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Helper functions
│   └── App.jsx              # Main component
│
├── backend/                 # Express API server
│   ├── server.js            # Express app
│   ├── providers.js         # AI adapters
│   ├── logger.js            # Logging
│   └── rateLimit.js         # Rate limiting
│
├── dist/                    # Built frontend (production)
├── .env                     # Configuration (create from .env.example)
├── .env.example             # Configuration template
├── PRODUCTION_READY.md      # Deployment guide
├── IMPROVEMENTS_REPORT.md   # What's new
└── FINAL_SUMMARY.md         # Overview
```

---

## Environment Variables

### Required
```bash
# At least ONE AI provider key:
OPENAI_API_KEY=...        # OpenAI GPT-4o
ANTHROPIC_API_KEY=...     # Anthropic Claude
GEMINI_API_KEY=...        # Google Gemini
GROQ_API_KEY=...          # Groq Llama
OLLAMA_BASE_URL=...       # Local Ollama
```

### Optional
```bash
NODE_ENV=development      # or 'production'
PORT=4000                 # Backend port
LOG_LEVEL=debug          # or 'info', 'warn', 'error'
VITE_API_URL=/api        # Frontend API endpoint
ALLOWED_ORIGINS=*        # Comma-separated CORS origins
```

---

## Testing

### Health Check
```bash
curl http://localhost:4000/health
# Response: { "status": "ok", "timestamp": "...", "environment": "..." }
```

### API Test
```bash
curl -X POST http://localhost:4000/api/ai \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "messages": [
      {"role": "user", "content": "A ball is thrown at 20 m/s at 45 degrees"}
    ]
  }'
```

### Frontend Test
Open http://localhost:5173 in browser and:
1. Enter a physics problem
2. Select an AI provider
3. Click "Solve"
4. Should see 3D simulation and solution

---

## Troubleshooting

### Port Already in Use
```bash
# Change port
PORT=8080 npm run dev:api
```

### API Key Not Working
```bash
# Check .env file exists and has correct key format
cat .env | grep API_KEY

# Verify key is valid:
# OpenAI: Starts with sk-proj-
# Anthropic: Starts with sk-ant-
# Gemini: Usually 39 chars alphanumeric
# Groq: Starts with gsk-
```

### Build Fails
```bash
# Clear node_modules and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Frontend/Backend Not Communicating
```bash
# Check VITE_API_URL in .env
cat .env | grep VITE_API_URL

# Development: http://localhost:4000/api
# Production: /api
```

---

## Performance Tips

### Faster Development
```bash
# Run frontend and backend in separate terminals for faster rebuilds
terminal 1: npm run dev
terminal 2: npm run dev:api
```

### Production Optimization
```bash
# Build with analysis
npm run build:analyze

# Check bundle size
ls -lh dist/assets/
```

---

## Deployment Checklist

- [ ] Node.js 18+ installed
- [ ] .env configured with API key
- [ ] `npm run build` succeeds
- [ ] Health check passes: `curl http://localhost:4000/health`
- [ ] Test problem parsing works
- [ ] API rate limiting observed
- [ ] Logs are readable (JSON format)

---

## Documentation

- **PRODUCTION_READY.md** - Full deployment guide (500+ lines)
- **IMPROVEMENTS_REPORT.md** - Detailed improvements & features
- **FINAL_SUMMARY.md** - Executive overview
- **TESTING.js** - Test scenarios and checklist
- **.env.example** - Configuration reference

---

**Ready to go!** 🎉

Pick a command above and start building.
