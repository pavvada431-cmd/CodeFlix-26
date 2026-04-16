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
│   │   ├── GraphPanel.jsx       # Enhanced with AI analysis
│   │   ├── SimulationRouter.jsx
│   │   ├── SplashScreen.jsx
│   │   └── Toast.jsx
│   ├── simulations/         # Physics simulations
│   │   ├── CircularMotion.jsx   # Orbital dynamics
│   │   ├── Collisions.jsx      # Elastic/inelastic collisions
│   │   ├── ElectricFields.jsx   # Coulomb force visualization
│   │   ├── FluidMechanics.jsx  # Archimedes & Bernoulli
│   │   ├── GravitationalOrbits.jsx
│   │   ├── InclinedPlane.jsx
│   │   ├── Optics.jsx          # Lenses & mirrors
│   │   ├── Pendulum.jsx
│   │   ├── ProjectileMotion.jsx
│   │   ├── RadioactiveDecay.jsx
│   │   ├── RotationalMechanics.jsx
│   │   ├── SpringMass.jsx
│   │   ├── Thermodynamics.jsx   # Maxwell-Boltzmann
│   │   └── WaveMotion.jsx      # Standing & traveling waves
│   ├── hooks/               # Custom React hooks
│   │   └── useSimulation.js
│   ├── data/                # Demo problems
│   └── utils/               # Utilities
│       ├── share.js         # URL encoding/decoding
│       └── toast.js         # Toast notifications
├── server.js                 # Claude API proxy server
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
│  │    SolutionPanel      │  │       SimulationRouter       ││
│  │  ┌────────────────┐  │  │  ┌────────────────────────┐  ││
│  │  │ Step-by-Step   │  │  │  │   3D Canvas (R3F)    │  ││
│  │  │ Solution       │  │  │  │  ┌──────────────────┐  │  ││
│  │  └────────────────┘  │  │  │ All 16 Simulations │  │  ││
│  │  ┌────────────────┐  │  │  └──────────────────┘  │  ││
│  │  │ GraphPanel     │  │  │  + AI Physics Tutor    │  ││
│  │  │ + AI Analysis  │  │  └────────────────────────┘  ││
│  │  │ + Quiz Mode    │  │                               ││
│  │  │ + Compare Mode │  │                               ││
│  │  └────────────────┘  │                               ││
│  └──────────────────────┘  └──────────────────────────────┘│
│                          useSimulation Hook                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Physics Engine (Matter.js)                 │  │
│  │              Scene Manager (Three.js)                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## AI-Powered Analysis (Optional)

To enable AI-powered physics tutoring and quiz generation:

```bash
# Install API dependencies
npm install cors express

# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run both servers
npm run dev:all
```

The GraphPanel will automatically:
1. Analyze simulation data after 5 seconds
2. Generate physics insights (principle, insight, application, experiment)
3. Create quiz questions based on the data
4. Detect energy conservation anomalies (highlights in red if >5% drift)

If the API is unavailable, local fallback analysis is used.

## Simulations

16 physics simulations covering:

| Category | Simulations |
|----------|------------|
| **Mechanics** | Inclined Plane, Projectile Motion, Pendulum, Circular Motion, Rotational Mechanics |
| **Energy** | Spring-Mass, Gravitational Orbits, Collisions |
| **Waves** | Wave Motion (Transverse, Longitudinal, Standing, Interference) |
| **Thermodynamics** | Ideal Gas, Maxwell-Boltzmann Distribution |
| **Electromagnetism** | Electric Fields, Equipotential Lines |
| **Optics** | Lenses, Mirrors, Dispersion, Total Internal Reflection |
| **Fluids** | Buoyancy, Bernoulli's Principle |
| **Nuclear** | Radioactive Decay, Chain Decay |

## GraphPanel Features

- **Real-time telemetry**: Live data visualization with Recharts
- **Compare mode**: Overlay two simulation runs with different variables
- **Energy conservation detection**: Highlights anomalies in red
- **CSV export**: Download full data stream
- **AI Physics Tutor**: 4-card analysis (principle, insight, application, experiment)
- **Quiz Mode**: Multiple-choice questions generated from simulation data

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
| `ANTHROPIC_API_KEY` | Claude API key (optional) | -                      |
