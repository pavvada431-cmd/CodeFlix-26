# SimuSolve

Interactive physics simulation platform that parses word problems into step-by-step solutions with live 3D trajectory visualizations.

## Tech Stack

- React 19 + Vite 8
- Three.js with `@react-three/fiber` and `@react-three/drei`
- Matter.js (physics engine)
- Recharts
- Tailwind CSS

## Project Structure

```
SimuSolve/
├── src/
│   ├── components/          # UI components
│   │   ├── Navbar.jsx
│   │   ├── ProblemInput.jsx
│   │   ├── SolutionPanel.jsx
│   │   ├── GraphPanel.jsx
│   │   ├── SimulationRouter.jsx
│   │   ├── SplashScreen.jsx
│   │   └── Toast.jsx
│   ├── simulations/         # Physics simulations
│   │   ├── InclinedPlane.jsx
│   │   ├── ProjectileMotion.jsx
│   │   └── Pendulum.jsx
│   ├── hooks/               # Custom React hooks
│   │   └── useSimulation.js
│   ├── data/                # Demo problems
│   └── utils/               # Utilities
│       ├── share.js         # URL encoding/decoding
│       └── toast.js         # Toast notifications
├── index.html
├── vite.config.js
└── package.json
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                          App                                 │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │ SplashScreen │  │     Navbar     │  │  ProblemInput  │  │
│  └──────────────┘  │  ┌────────────┐ │  └────────────────┘  │
│                    │  │ Share Btn  │ │                      │
│                    │  │ Demo Btn   │ │                      │
│                    │  └────────────┘ │                      │
│                    └────────────────┘                      │
│  ┌──────────────────────┐  ┌──────────────────────────────┐│
│  │    SolutionPanel     │  │       SimulationRouter       ││
│  │  ┌────────────────┐  │  │  ┌────────────────────────┐  ││
│  │  │ Step-by-Step   │  │  │  │   3D Canvas (R3F)      │  ││
│  │  │ Solution       │  │  │  │  ┌──────────────────┐  │  ││
│  │  └────────────────┘  │  │  │  │ InclinedPlane    │  │  ││
│  │  ┌────────────────┐  │  │  │  │ ProjectileMotion │  │  ││
│  │  │ GraphPanel     │  │  │  │  │ Pendulum         │  │  ││
│  │  │ (Recharts)     │  │  │  │  └──────────────────┘  │  ││
│  │  └────────────────┘  │  │  └────────────────────────┘  ││
│  └──────────────────────┘  └──────────────────────────────┘│
│                          useSimulation Hook                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Physics Engine (Matter.js)              │  │
│  │              Scene Manager (Three.js)                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Demo Problems

Click "Try Demo" to load one of 5 pre-configured physics problems:

1. **Inclined Plane** - Box sliding down a ramp
2. **Projectile Motion** - Ball thrown at an angle
3. **Pendulum** - Swinging pendulum simulation
4. **Free Fall** - Object dropped from height
5. **Two-Body** - Connected masses system

## Sharing

Click "Share" to copy a URL with the problem encoded as a query parameter. Anyone with the link will see the same demo.

## Build

```bash
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

| Variable       | Description                  | Default                |
|---------------|------------------------------|------------------------|
| `VITE_API_URL`| Backend API endpoint         | `http://localhost:3001`|
