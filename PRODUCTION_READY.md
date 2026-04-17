# CodeFlix 🔬⚛️

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](#)

Interactive physics and chemistry simulation platform that parses natural language problems into step-by-step solutions with live 3D visualizations. Powered by AI (OpenAI, Anthropic, Google Gemini, Groq, Ollama).

## ✨ Features

- **🤖 AI-Powered Problem Parsing**: Natural language problem → Structured physics/chemistry solution
- **📊 Live 3D Simulations**: Matter.js + Three.js visualization of physics scenarios
- **📈 Real-time Graphs**: Trajectory, energy, force, and custom charts
- **🎯 Multi-domain Support**: Physics, Chemistry, Thermodynamics, Waves, Optics, and more
- **🔌 Multi-provider AI**: OpenAI, Anthropic, Google Gemini, Groq, or local Ollama
- **🎨 Professional UI**: Dark theme, responsive design, real-time feedback
- **🚀 Production Ready**: Error handling, rate limiting, logging, graceful shutdown

## 🏗️ Tech Stack

**Frontend:**
- React 19 + Vite 8 (fast HMR, optimized builds)
- Three.js + @react-three/fiber (3D visualization)
- Matter.js (physics engine)
- Recharts (data visualization)
- Tailwind CSS 4 (styling)

**Backend:**
- Express.js (Node.js API server)
- Multi-provider AI adapter (OpenAI, Anthropic, Gemini, Groq, Ollama)
- Rate limiting, CORS, structured logging
- Graceful shutdown & error handling

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- API keys for at least one AI provider:
  - [OpenAI](https://platform.openai.com)
  - [Anthropic](https://console.anthropic.com)
  - [Google Gemini](https://ai.google.dev)
  - [Groq](https://console.groq.com)
  - [Ollama](https://ollama.ai) (local)

### Development Setup

```bash
# Clone and install
git clone https://github.com/yourusername/codeflix.git
cd codeflix
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your AI provider keys

# Run development servers (both frontend and backend)
npm run dev:all

# Or run separately:
npm run dev      # Frontend on http://localhost:5173
npm run dev:api  # Backend on http://localhost:4000
```

### Production Build & Deployment

```bash
# Build frontend
npm run build

# Test production build locally
npm run preview

# Start backend in production mode
NODE_ENV=production npm start

# With custom port
PORT=8080 NODE_ENV=production npm start
```

## 📋 Environment Configuration

Create a `.env` file (copy from `.env.example`):

```bash
# Frontend API endpoint
VITE_API_URL=/api                    # Production: relative path
# VITE_API_URL=http://localhost:4000/api  # Development

# AI Provider Keys (add at least one)
OPENAI_API_KEY=sk-proj-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
GEMINI_API_KEY=xxxxx
GROQ_API_KEY=gsk-xxxxx

# Backend Configuration
PORT=4000
NODE_ENV=development
LOG_LEVEL=debug
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

See `.env.example` for complete configuration options.

## 📁 Project Structure

```
codeflix/
├── src/                          # Frontend (React + Vite)
│   ├── components/
│   │   ├── Navbar.jsx           # Top navigation
│   │   ├── Sidebar.jsx          # Problem input panel
│   │   ├── SimulationCard.jsx   # 3D canvas container
│   │   ├── GraphPanel.jsx       # Charts & graphs
│   │   ├── ErrorBoundary.jsx    # Error handling
│   │   ├── PhysicsLibrary.jsx   # Problem templates
│   │   └── ...
│   ├── simulations/             # Physics simulation implementations
│   │   ├── InclinedPlane.jsx
│   │   ├── ProjectileMotion.jsx
│   │   ├── Pendulum.jsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useSimulation.js     # Main simulation state
│   │   ├── usePerformanceMonitor.js
│   │   └── useSession.js        # Session tracking
│   ├── utils/
│   │   ├── api.js               # Axios client with retry logic
│   │   ├── problemParser.js     # AI problem parsing
│   │   ├── validator.js         # Input validation
│   │   └── physicsEngine.js     # Matter.js wrapper
│   └── App.jsx                  # Main component
│
├── backend/                      # Express API (Node.js)
│   ├── server.js                # Express app & routes
│   ├── providers.js             # AI provider adapters
│   ├── logger.js                # Structured logging
│   └── rateLimit.js             # Rate limiting middleware
│
├── .env.example                 # Configuration template
├── package.json                 # Dependencies & scripts
├── vite.config.js               # Frontend build config
├── tailwind.config.js           # Tailwind CSS config
└── README.md                    # This file
```

## 🔌 API Routes

### Health Check
```bash
GET /health
# Response: { "status": "ok", "timestamp": "...", "environment": "..." }
```

### Problem Parsing & AI
```bash
POST /api/ai
Content-Type: application/json

{
  "provider": "openai",
  "messages": [
    {"role": "system", "content": "You are a physics expert..."},
    {"role": "user", "content": "A 10kg block slides down a 30° incline..."}
  ],
  "options": {
    "temperature": 0,
    "max_tokens": 1200
  }
}

# Response:
{
  "success": true,
  "data": {
    "content": "The acceleration is...",
    "provider": "openai",
    "model": "gpt-4o",
    "tokensUsed": 245
  },
  "timestamp": "2026-04-17T03:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid messages array
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - AI provider failure

## 🛡️ Security & Production Features

✅ **Error Handling**
- Global error boundary for React components
- Try-catch on async operations
- Structured error responses with error codes
- Development-only error details

✅ **Rate Limiting**
- 100 requests per 15 minutes per IP
- Automatic cleanup of old request records
- HTTP 429 response on limit exceeded

✅ **CORS**
- Configurable allowed origins
- Credentials support
- Precompiled OPTIONS requests

✅ **Input Validation**
- Message format validation
- Provider identifier validation
- Request size limits (10KB JSON)

✅ **Logging**
- Structured JSON logging
- Request/response duration tracking
- Error stack traces (dev only)
- Log levels: DEBUG, INFO, WARN, ERROR

✅ **Graceful Shutdown**
- SIGTERM/SIGINT handlers
- Unhandled rejection detection
- Connection cleanup

## 📊 Supported Simulations

### Physics
- **Mechanics**: Inclined Plane, Projectile Motion, Circular Motion, Collisions
- **Waves & Oscillations**: Pendulum, Spring-Mass, Wave Motion
- **Rotation**: Rotational Mechanics, Gyroscopes
- **Gravitation**: Orbital Mechanics, Gravitational Fields
- **Fluids**: Buoyancy, Fluid Mechanics
- **Optics**: Lens Systems, Mirror Reflections
- **Electricity & Magnetism**: Electric Fields, Magnetic Fields
- **Thermodynamics**: Ideal Gas Law, Maxwell-Boltzmann Distribution
- **Nuclear**: Radioactive Decay

### Chemistry
- Electrolysis & Electrochemistry
- Thermochemistry
- Spectroscopy (simulated)
- Molecular dynamics

## 🎯 Performance Optimization

- **Code Splitting**: Lazy-loaded simulation components
- **Memoization**: React.memo, useMemo, useCallback on heavy components
- **Throttling**: Simulation loop at 60 FPS with fixed timestep
- **Bundle Analysis**: `npm run build:analyze`
- **Image Optimization**: Compressed sprites and textures

## 🐛 Development Tips

### Debug Mode
```bash
# Enable verbose logging
LOG_LEVEL=debug npm run dev:api

# Frontend debug in browser console
localStorage.setItem('debug', 'codeflix:*')
```

### Testing Locally
```bash
# Build and test production version
npm run build
npm run preview    # Frontend preview
NODE_ENV=production npm run dev:api  # Backend
```

### Performance Profiling
```bash
# Generate build report
npm run build:analyze

# Check bundle size
npm run build -- --report-compressed
```

## 🚀 Deployment

### Docker Deployment

```dockerfile
# See Dockerfile and Dockerfile.backend
docker-compose up -d
```

### Manual Deployment (Ubuntu/Debian)

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone https://github.com/yourusername/codeflix.git
cd codeflix
npm install
npm run build

# Create .env file with production keys
cp .env.example .env
nano .env  # Edit with your credentials

# Run with PM2 (recommended)
npm install -g pm2
pm2 start "npm start" --name codeflix
pm2 save
pm2 startup
```

### Environment-Specific Config

**Development**
```bash
NODE_ENV=development
LOG_LEVEL=debug
VITE_API_URL=http://localhost:4000/api
```

**Production**
```bash
NODE_ENV=production
LOG_LEVEL=info
VITE_API_URL=/api
ALLOWED_ORIGINS=https://example.com,https://www.example.com
PORT=8080
```

## 📚 API Provider Comparison

| Provider | Model | Speed | Cost | Limits |
|----------|-------|-------|------|--------|
| **OpenAI** | GPT-4o | Fast | Medium | 60 requests/min |
| **Anthropic** | Claude Sonnet 4 | Fast | Medium | 50 requests/min |
| **Gemini** | 1.5 Flash | Very Fast | Low | 60 requests/min |
| **Groq** | Llama 3.3 70B | Fastest | Low | 120 requests/min |
| **Ollama** | Local/Cloud | Depends | Free* | Unlimited |

*Ollama requires self-hosted setup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Three.js for 3D graphics
- Matter.js for physics simulation
- React Three Fiber for React integration
- All AI providers (OpenAI, Anthropic, Google, Groq, Ollama)

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/codeflix/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/codeflix/discussions)
- **Email**: support@example.com

---

**Made with ❤️ for physics and chemistry education**
