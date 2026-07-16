# LeaveWise

LeaveWise is an AI-powered daily commute assistant built for one practical question:

> Should I drive, take public transport, or leave earlier today?

It combines browser geolocation, Google Maps routing, weather data, and LLM-backed narration to generate a short, decision-focused commute recommendation.

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
- Rule-based commute decision logic
- LLM-backed recommendation explanation with provider routing
- Google Calendar OAuth connection for next-event arrival-time suggestions
- Saved destinations and returning-user auto-plan behavior
- Playwright end-to-end tests for the main frontend flow
- Pytest coverage for core backend planner and API behavior

Still in progress or not yet complete:

- Stronger live transit delay enrichment from Auckland Transport realtime feeds
- More polished calendar-driven commute automation
- User preference learning beyond the current simple preference selector
- Production deployment and full environment hardening

## What The App Does

On a normal run, LeaveWise:

1. Reads the user's current browser location.
2. Reverse-geocodes that location into a readable origin.
3. Fetches driving route data from Google Routes.
4. Fetches a transit option from Google Routes.
5. Fetches current weather from Open-Meteo.
6. Uses planner logic to decide which mode is better.
7. Uses an LLM to explain that decision in one short sentence.

If the LLM is disabled or unavailable, the planner still returns a usable fallback recommendation based on the same structured data.

## Architecture

```text
Next.js Frontend
        |
        v
FastAPI API Layer
        |
        v
PlannerService
        |
  +------------------------+
  | Google Maps            |
  | Open-Meteo             |
  | LLM providers          |
  | Google Calendar (opt.) |
  +------------------------+
        |
        v
Commute recommendation JSON
```

Current backend flow:

- `backend/api/commute.py` exposes `POST /commute/plan`
- `backend/services/planner.py` composes route, weather, and decision logic
- `backend/services/google_maps.py` wraps Google geocoding and routing calls
- `backend/services/weather.py` wraps weather retrieval
- `backend/services/llm.py` handles decision and narration model calls
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
- Requests

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

- Uses rule-based logic for the core decision
- Can use separate LLM providers for decision and narration
- Falls back safely if model calls fail

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
    "status": "NX1 is running on time.",
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
  "routing_basis": "live"
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
  api/
  core/
  services/
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
- `backend/services/planner.py`
- `backend/services/google_maps.py`
- `backend/services/weather.py`
- `backend/services/llm.py`

## Local Setup

### 1. Backend

Create your local environment file from `backend/.env.example` and add the keys you want to use.

Important environment variables:

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
OPENAI_API_KEY=your_openai_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
LLM_PROVIDER=openai
DECISION_LLM_PROVIDER=openai
NARRATION_LLM_PROVIDER=openai
LLM_ENABLED=true
GOOGLE_CALENDAR_CLIENT_ID=your_google_calendar_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_google_calendar_client_secret
```

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
- planner classification logic
- target departure calculations

GitHub Actions workflow:

- `.github/workflows/e2e-tests.yml` runs Playwright tests on pushes and pull requests to `main` and `master`

## Product Direction

LeaveWise is meant to be a daily commute assistant, not a general travel planner or transport dashboard.

The current implementation is focused on:

- fast daily decision-making
- concise recommendations
- real API data where practical
- portfolio-quality full-stack integration without over-engineering

## Near-Term Next Steps

- Improve transit delay accuracy using Auckland Transport realtime data
- Tighten the planner heuristics for weather and traffic tradeoffs
- Expand calendar-assisted planning
- Replace remaining rough edges in the UI with richer real-data presentation
- Add stronger error handling around upstream API failures
