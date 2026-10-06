# LeaveWise

LeaveWise is an AI-powered daily commute assistant built for one practical question:

> Should I drive, take public transport, or leave earlier today?

It combines browser geolocation, Google Maps routing, weather data, and a tool-calling AI agent to generate a short, decision-focused commute recommendation. The agent autonomously gathers live route and weather data through tools and decides the commute mode; a deterministic rule-based pipeline provides the baseline guardrails and the fallback path.

## Current Status

This project is now beyond the initial UI prototype stage.

What is working today:

- Next.js frontend with a responsive, mobile-first single-page UI
- FastAPI backend with a thin API layer and a dedicated planner service
- Browser geolocation
- Reverse geocoding for the user's current location
- Google Routes API driving estimates
- Google Routes API transit comparison
- Open-Meteo current weather integration
- Tool-calling commute agent: a bounded agent loop that chooses which data tools to call (driving route, transit route, weather) and decides the commute mode via a schema-constrained submit tool
- Rule-based commute decision logic as guardrail and fallback
- LLM-backed recommendation explanation with provider routing
- Agent transparency: the API returns the agent's tool-call trace and reasoning
- Google Calendar OAuth connection for next-event arrival-time suggestions
- Saved destinations and returning-user auto-plan behavior
- Playwright end-to-end tests for the main frontend flow
- Pytest coverage for core backend planner and API behavior

Still in progress or not yet complete:

- Live transit delay enrichment: an Auckland Transport GTFS / realtime client exists in `backend/services/auckland_transport.py` but is not yet wired into the planning flow
- More polished calendar-driven commute automation
- User preference learning beyond the current simple preference selector
- Production deployment and full environment hardening

## What The App Does

On a normal run, LeaveWise:

1. Reads the user's current browser location.
2. Reverse-geocodes that location into a readable origin and geocodes the destination.
3. Hands the request to the commute agent, which decides for itself which tools to call and in what order — for example: check the driving route, notice rain in the weather result, then also check transit for a target departure window.
4. The agent finishes through a forced `submit_recommendation` tool call, so the mode decision is always schema-constrained rather than parsed from free text.
5. The planner reuses whatever data the agent collected (nothing is fetched twice), fills any gaps directly from the services, and applies rule-based guardrails to the final decision.
6. A separate narration task explains the decision in one short sentence.

The agent loop is bounded (`AGENT_MAX_TURNS`), and origin/destination are bound from the request context rather than exposed as tool parameters — the model chooses *what* and *when* to fetch, never *where to*. If the agent is disabled, times out, or fails, the deterministic planner pipeline runs the whole flow itself and still returns a usable recommendation.

## Why No Agent Framework?

The commute agent is a **hand-rolled tool-calling loop** — it does not use LangChain, LangGraph, the OpenAI Agents SDK, CrewAI, or even the official `openai` / `anthropic` Python SDKs. Every model call is a plain `requests.post` to the provider's HTTP API.

This was a deliberate choice for this stage of the project:

- **The problem is small and bounded.** One decision (drive vs. transit), three data tools, one submit tool, a hard turn cap. A single `for` loop expresses that more clearly than a graph or chain abstraction.
- **Every mechanism is visible.** Tool schemas, the `tool_use` → `tool_result` message round-trip, the forced final `tool_choice`, the turn cap, and the fallback path all live in one file (`backend/agents/commute_agent.py`) and can be read top to bottom.
- **Provider-agnostic by construction.** Tools are defined once in a neutral JSON Schema format (`backend/tools/`) and translated into both the Anthropic Messages format and the OpenAI-compatible format (used for OpenAI and DeepSeek). Switching provider is one environment variable.
- **Safety properties are explicit, not implied by a library default:**
  - origin and destination are bound from the request context, never exposed as tool parameters
  - the loop is capped at `AGENT_MAX_TURNS`, and the last turn forces `submit_recommendation`
  - the submitted mode is validated against an allowed set before it is used
  - any transport error, timeout, or invalid output returns `None`, and the deterministic planner takes over
- **Minimal dependencies.** The backend needs only FastAPI, Pydantic, Requests, and python-dotenv, so reviewers can run it locally with little setup.
- **Easy to test.** Because the transport is a single `_post_json` method, tests can stub model responses directly and assert on tool dispatch, forced submit, provider formats, and fallback behaviour.

When a framework would become worth it: multi-step or branching workflows, multiple cooperating agents, persistent memory, human-in-the-loop approval steps, or a need for built-in tracing dashboards. At that point LangGraph (or a provider agent SDK) is the natural next step, and the existing tool definitions can be reused.

## Architecture

```text
Next.js Frontend
        |
        v
FastAPI API Layer
        |
        v
PlannerService ──────────────────┐
        |                        │ fallback / guardrails
        v                        │ (rule-based pipeline)
CommuteAgent (bounded tool loop) │
        |                        │
  tool calls chosen by the model │
        v                        │
  +---------------------------+  │
  | get_driving_route         |  │
  | get_transit_route         |──┘
  | get_current_weather       |
  | submit_recommendation     |
  +---------------------------+
        |
  Google Maps / Open-Meteo
        |
        v
Commute recommendation JSON (+ agent trace)
```

Current backend flow:

- `backend/api/commute.py` exposes `POST /commute/plan`
- `backend/services/planner.py` orchestrates the agent, fills data gaps, and applies rule-based guardrails and fallback
- `backend/agents/commute_agent.py` runs the bounded tool-calling agent loop (Anthropic and OpenAI-compatible providers)
- `backend/tools/` defines the provider-neutral tool schemas and executors that wrap the services
- `backend/services/google_maps.py` wraps Google geocoding and routing calls
- `backend/services/weather.py` wraps weather retrieval
- `backend/services/llm.py` handles the single-shot decision and narration model calls
- `backend/api/calendar.py` and `backend/services/google_calendar.py` handle Google Calendar OAuth and next-event lookup

## Tech Stack

Frontend:

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

Backend:

- FastAPI
- Python
- Pydantic
- Requests (direct HTTP calls to all external APIs, including LLM providers)

AI / agent layer:

- Hand-rolled tool-calling agent loop (no agent framework, no provider SDKs)
- Supported providers: Anthropic, OpenAI, DeepSeek

External APIs and services:

- Browser Geolocation API
- Google Geocoding API
- Google Routes API
- Open-Meteo Weather API
- OpenAI API
- DeepSeek API
- Anthropic API
- Google Calendar API

## Key Features In The Current Build

### Commute planning

- Accepts current coordinates, destination, optional target arrival time, and a simple travel preference
- Returns both route data and a final recommendation
- Supports predicted routing when an arrival time is provided

### Recommendation engine

- A bounded tool-calling agent gathers data and makes the mode decision
- Rule-based guardrails keep the outcome sensible (e.g. never recommend transit when no route is available; prefer the faster option under normal conditions)
- Agent, decision, and narration tasks can each run on a different LLM provider
- Falls back safely to the deterministic pipeline if model calls fail

### Frontend experience

- Weather-reactive background scene
- Recommendation card with leave time, arrival time, travel time, and explanation
- Saved destination shortcuts in `localStorage`
- Automatic re-plan for returning users
- Browser notification reminder support for leave time

### Calendar support

- Google Calendar connect / disconnect flow
- Reads the next upcoming event
- Suggests an arrival time based on that event

## API

Main endpoint:

```http
POST /commute/plan
```

Example request:

```json
{
  "latitude": -36.82,
  "longitude": 174.61,
  "destination": "Auckland CBD, Auckland, New Zealand",
  "arrival_time": "08:25",
  "preference": "Fastest route"
}
```

Typical response shape:

```json
{
  "current_location": "23 Saint Catherine Crescent, West Harbour, Auckland 0618, New Zealand",
  "destination": "Auckland CBD, Auckland, New Zealand",
  "driving_route": {
    "duration": "1250s",
    "distance_meters": 19052,
    "static_duration": "1080s"
  },
  "transit_route": {
    "available": true,
    "status": "No transfers needed.",
    "route_label": "NX1",
    "departure_time": "8:05 AM",
    "arrival_time": "8:42 AM",
    "travel_time_minutes": 37
  },
  "weather": {
    "temperature": 12.5,
    "feels_like": 10.8,
    "precipitation": 0,
    "rain": 0,
    "weather_code": 3,
    "wind_speed": 15.2
  },
  "weather_notice": null,
  "recommendation": "Leave now by car. Driving is estimated to take about 21 minutes and conditions look fine.",
  "decision": {
    "recommended_mode": "driving",
    "recommended_label": "Drive",
    "leave_time": "8:04 AM",
    "arrival_time": "8:25 AM",
    "travel_time_minutes": 21
  },
  "routing_basis": "live",
  "agent": {
    "used": true,
    "turns": 3,
    "reasoning": "Driving is 16 minutes faster and the weather is clear.",
    "trace": [
      { "tool": "get_driving_route", "input": {}, "status": "ok" },
      { "tool": "get_current_weather", "input": {}, "status": "ok" },
      { "tool": "get_transit_route", "input": { "departure_time": "07:45" }, "status": "ok" }
    ]
  }
}
```

Calendar endpoints currently exposed:

- `GET /calendar/status`
- `GET /calendar/oauth/login`
- `GET /calendar/oauth/callback`
- `POST /calendar/disconnect`
- `GET /calendar/next-event`

## Project Structure

```text
frontend/
  app/
    components/
    hooks/
  tests/

backend/
  agents/
  api/
  core/
  services/
  tools/
  tests/
  main.py
```

Notable files:

- `frontend/app/components/HomeClient.tsx`
- `frontend/app/components/CommuteToolbar.tsx`
- `frontend/app/components/RecommendationCard.tsx`
- `frontend/app/hooks/useGeolocation.ts`
- `frontend/app/hooks/useGoogleCalendar.ts`
- `backend/api/commute.py`
- `backend/api/calendar.py`
- `backend/agents/commute_agent.py`
- `backend/tools/route_tool.py`
- `backend/tools/weather_tool.py`
- `backend/services/planner.py`
- `backend/services/google_maps.py`
- `backend/services/weather.py`
- `backend/services/llm.py`

## Local Setup

### 1. Backend

Create your local environment file from `backend/.env.example` and add the keys you want to use.

Important environment variables:

```env
# Required
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# LLM providers (set at least one key to enable AI features)
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-chat

# Provider routing: anthropic | openai | deepseek
LLM_PROVIDER=anthropic          # default for any task not overridden below
DECISION_LLM_PROVIDER=          # blank = use LLM_PROVIDER
NARRATION_LLM_PROVIDER=
AGENT_LLM_PROVIDER=
LLM_ENABLED=true
LLM_TIMEOUT_SECONDS=20

# Tool-calling agent
AGENT_ENABLED=true
AGENT_MAX_TURNS=5

# Optional: Google Calendar
GOOGLE_CALENDAR_CLIENT_ID=your_google_calendar_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_google_calendar_client_secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:8000/calendar/oauth/callback
```

Notes:

- In Google Cloud, enable the **Geocoding API** and **Routes API** for your key. The legacy Directions API is not used.
- Open-Meteo needs no API key.
- With `LLM_ENABLED=false` or no provider key, the app still works end to end using the deterministic planner and its rule-based explanation.
- `backend/.env.example` also lists Gemini, Ollama, and OpenWeather variables as placeholders; those providers are not implemented yet.

Install and run:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend

Install and run:

```bash
cd frontend
npm install
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

## Testing

Frontend E2E tests:

```bash
cd frontend
npx playwright test
```

Backend tests:

```bash
cd backend
source .venv/bin/activate
pytest
```

Current automated test coverage includes:

- homepage render
- browser geolocation planning flow
- mocked end-to-end commute planning flow
- commute API contract behavior
- Google Maps service wrapper (mocked HTTP)
- agent loop behavior (tool dispatch, forced final submit, provider formats, failure fallback)
- planner-agent integration (data reuse, guardrail overrides, deterministic fallback)
- planner classification logic
- target departure calculations

GitHub Actions workflow:

- `.github/workflows/e2e-tests.yml` runs Playwright tests on pushes and pull requests to `main` and `master`
- Backend `pytest` currently runs locally only; it is not yet part of CI

## Product Direction

LeaveWise is meant to be a daily commute assistant, not a general travel planner or transport dashboard.

The current implementation is focused on:

- fast daily decision-making
- concise recommendations
- real API data where practical
- portfolio-quality full-stack integration without over-engineering

## Known Limitations

- The frontend calls the backend at a hard-coded `http://localhost:8000`; there is no environment-based API URL yet.
- Times are computed in the `Pacific/Auckland` timezone, so the app currently assumes an Auckland-based user.
- Transit status comes from Google Routes (route, times, transfers). Realtime delays and service alerts are not yet included, and the agent is instructed not to invent them.
- Google Calendar tokens are stored in a local file, so calendar support is single-user and local-only.
- There is no authentication, rate limiting, or deployment configuration yet.

## Near-Term Next Steps

- Surface the agent's tool-call trace in the UI ("how the AI decided")
- Improve transit delay accuracy using Auckland Transport realtime data
- Tighten the planner heuristics for weather and traffic tradeoffs
- Expand calendar-assisted planning
- Replace remaining rough edges in the UI with richer real-data presentation
- Add stronger error handling around upstream API failures
- Add backend `pytest` to the CI workflow
- Move the backend URL into a `NEXT_PUBLIC_API_BASE_URL` environment variable
- Optionally, build a LangGraph version of the agent as a side-by-side comparison with the hand-rolled loop
