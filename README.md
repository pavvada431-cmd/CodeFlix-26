<div align="center">

<img src="public/logo.svg" width="96" alt="SeeTheScience"/>

# SeeTheScience

**Type a physics or chemistry problem in plain English. Watch it come alive.**

AI-powered parsing → interactive 2D simulations → step-by-step solutions → live telemetry graphs.

[Quickstart](#quickstart) · [Simulations](#simulations) · [Architecture](#architecture) · [AI Providers](#ai-providers) · [Deployment](#deployment)

</div>

---

## What it does

Paste a word problem. A language model extracts the variables, units, and assumptions. The app picks the right simulation, renders it live, steps you through the derivation, and plots telemetry as it runs. You can scrub variables and watch the physics respond in real time.

No mouse-and-menu formula picker. No fiddling with 3D cameras. Just the problem → the science.

## Features

- **Natural-language parser** — one-shot problem → `{type, variables, steps}` JSON with a safety-net offline parser when the API is down.
- **23 interactive simulations** spanning mechanics, E&M, optics, thermodynamics, fluids, nuclear, and chemistry — all rendered as crisp 2D SVG (no WebGL tax).
- **Live telemetry** — Recharts plots update every frame; drift from energy conservation is flagged in red.
- **Variable scrubbing** — edit any parameter; the sim pauses, reseeds, and replays.
- **Solution timeline** — step-by-step derivation with KaTeX math, synced to playback.
- **Compare mode** — overlay two runs with different parameters on the same axes.
- **Quiz & tutor** — model-generated multiple-choice questions grounded in the live data stream.
- **Multi-concept pipeline** — chain sims (e.g. "projectile lands on incline") into staged scenarios.
- **Builder** — save, gallery, and share custom scenarios via URL.
- **Offline-first** — every feature degrades gracefully when no API key is configured.

## Quickstart

```bash
npm install
npm run dev         # frontend only  (http://localhost:5173)
npm run dev:api     # backend only   (http://localhost:3001)
npm run dev:all     # both, concurrently
```

Open `http://localhost:5173`. No API key needed for the offline parser and all simulations.

## AI providers

Drop any subset of keys in `.env` — the app auto-selects a provider and falls back to offline parsing if none respond.

```bash
cp .env.example .env
```

| Key | Model |
|---|---|
| `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |
| `OPENAI_API_KEY` | `gpt-4o` |
| `GEMINI_API_KEY` | `gemini-1.5-flash` |
| `GROQ_API_KEY` | `llama-3.3-70b-versatile` |

All provider calls go through `backend/server.js` — keys never touch the browser.

## Simulations

| Category | Topics |
|---|---|
| **Mechanics** | Inclined plane · Projectile motion · Pendulum · Circular motion · Collisions · Rotational mechanics |
| **Energy & gravity** | Spring-mass (SHM + damped) · Gravitational orbits |
| **Waves** | Transverse · longitudinal · standing · interference |
| **Fluids & thermo** | Buoyancy · Bernoulli · Ideal gas PV diagrams · Maxwell-Boltzmann |
| **E & M** | Electric fields + equipotentials · Magnetic fields · Circuits |
| **Optics** | Lenses · mirrors · ray diagrams |
| **Nuclear** | Radioactive decay · chain decay · half-life |
| **Chemistry** | Organic chemistry · stoichiometry · titration · atomic structure · gas laws · chemical bonding · combustion |

Every entry in the in-app Physics and Chemistry libraries has a live simulation behind it.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (React 19 + Vite 8 + Tailwind 4)                    │
│                                                              │
│   Landing → Physics / Chemistry / Builder / Formulas         │
│      │                                                       │
│      ▼                                                       │
│   ProblemInput ──► useSimulation ──► SimulationRouter        │
│                        │                   │                 │
│                        ▼                   ▼                 │
│                  Telemetry buffer    23 × 2D SVG sims        │
│                        │                                     │
│                        ▼                                     │
│                   GraphPanel (Recharts) · SolutionTimeline   │
│                                                              │
└───────────────────────────┬──────────────────────────────────┘
                            │ POST /api/ai
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Express proxy (backend/server.js)                           │
│    providers.js: Anthropic · OpenAI · Gemini · Groq          │
│    rateLimit.js · logger.js · offline fallback parser        │
└──────────────────────────────────────────────────────────────┘
```

**Key paths**

- `src/simulations/*2D.jsx` — each topic is one self-contained SVG component.
- `src/hooks/useSimulation.js` — playback state, circular telemetry buffer, variable scrubbing.
- `src/utils/problemParser.js` — AI call + offline heuristic parser.
- `src/utils/physicsEngine.js` — Matter.js bridge for rigid-body sims.
- `backend/providers.js` — one adapter per LLM provider.

## Scripts

```bash
npm run dev          # vite dev server
npm run dev:api      # express API on :3001
npm run dev:all      # both
npm run build        # production bundle
npm run preview      # serve the build
npm run lint         # eslint
npm run type-check   # tsc --noEmit
npm start            # NODE_ENV=production node backend/server.js
```

## Deployment

**Docker**

```bash
docker compose up --build
```

Separate images are provided for `frontend` (nginx + static build) and `backend` (node).

**Bare metal**

```bash
npm ci && npm run build
NODE_ENV=production node backend/server.js
```

`nginx.conf` is included for reverse-proxying the static bundle + `/api/*`.

## Contributing

Pull requests are welcome. For new simulations: add `src/simulations/YourTopic2D.jsx`, register the type in `src/hooks/useSimulation.js` (`SIMULATION_*` maps) and route it in `src/components/SimulationRouter.jsx`.

## License

MIT.
