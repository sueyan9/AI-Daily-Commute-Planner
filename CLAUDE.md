# CLAUDE.md — Claude Code Instructions for LeaveWise

## Project Name

LeaveWise

## Product Summary

LeaveWise is an AI-powered daily commute assistant. It helps the user decide when to leave home and whether to drive or use public transport by combining location, route, weather, and AI reasoning.

This is a portfolio project focused on real-world AI application engineering, not a simple chatbot.

---

## Core Product Positioning

Do not treat this as a tourism or travel itinerary app.

This is for daily life:

> The user wakes up, opens the app, checks current weather and commute conditions, and decides when and how to leave.

The main decision is:

> Should I drive, take public transport, or leave earlier today?

---

## Current Architecture

```text
Next.js Frontend
        │
        ▼
FastAPI Backend
        │
        ▼
Services / Agent Layer
        │
 ┌───────────────┐
 │ Google Maps   │
 │ Open-Meteo    │
 │ AI Model      │
 └───────────────┘
        │
        ▼
AI Recommendation
```

---

## Current Stack

### Frontend

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- App Router

### Backend

- FastAPI
- Python
- REST API

### External APIs

- Browser Geolocation API
- Google Geocoding API
- Google Routes API
- Open-Meteo Weather API
- Planned: DeepSeek or OpenAI

---

## Development Philosophy

Use vertical slices.

Each step should produce something working end-to-end.

Preferred order:

1. UI sends request.
2. Backend receives request.
3. Backend calls real external API.
4. Backend returns JSON.
5. Frontend displays real result.
6. Then improve UI.

Avoid generating large amounts of mock data unless the user explicitly asks for mock data.

---

## Current Completed Features

- Responsive single-page UI
- Browser geolocation
- FastAPI backend
- CORS setup
- Frontend-to-backend API call
- Reverse geocoding using Google Geocoding API
- Driving estimate using Google Routes API
- Current weather data using Open-Meteo

---

## Next Priority

Implement AI recommendation.

The backend should combine:

- current location
- destination
- driving route duration
- driving distance
- current weather

and return a short recommendation.

Example response field:

```json
{
  "recommendation": "Leave now by car. Driving is estimated to take about 21 minutes, and current weather conditions are mild. There is no strong weather reason to avoid driving today."
}
```

---

## Backend Guidelines

### Keep API layer thin

`backend/api/commute.py` should not grow too large.

It should eventually delegate to:

```text
backend/services/planner.py
```

or:

```text
backend/agents/commute_agent.py
```

### Keep external API wrappers in `services/`

Current service files:

```text
backend/services/google_maps.py
backend/services/weather.py
```

Planned:

```text
backend/services/llm.py
backend/services/planner.py
```

### Keep environment variables centralised

Use:

```python
from core.config import settings
```

Do not call `load_dotenv()` repeatedly inside service files.

---

## Google Maps Notes

The old Directions API may return:

```text
REQUEST_DENIED: legacy API not enabled
```

Use Google Routes API instead:

```text
https://routes.googleapis.com/directions/v2:computeRoutes
```

Routes API returns duration like:

```json
"duration": "1250s"
```

Format it on the frontend or with a shared helper later.

---

## Weather API Notes

Use Open-Meteo.

Reasons:

- free
- no API key required
- easy for portfolio reviewers to run locally
- enough for commute weather decisions

Do not replace it with Google Weather unless the user specifically asks.

---

## AI Recommendation Guidelines

Recommendation should be practical and concise.

It should not hallucinate traffic incidents or public transport delays unless those data sources exist.

Good:

```text
Driving is estimated to take about 21 minutes. Weather conditions are mild, with light wind and no current rain. Driving is a reasonable option right now.
```

Bad:

```text
There is an accident on SH1, so take the bus.
```

Do not mention accidents unless the API data explicitly provides accident data.

---

## Frontend Guidelines

Keep the UI consumer-friendly.

Visual style:

- soft gradient background
- rounded cards
- glassmorphism
- mobile-first
- friendly daily assistant feel

Avoid:

- dashboard-heavy layouts
- dense tables
- admin panel style
- cyberpunk or terminal UI

Current main client component:

```text
frontend/app/components/HomeClient.tsx
```

Geolocation hook:

```text
frontend/app/hooks/useGeolocation.ts
```

---

## Debugging Checklist

### Frontend says `Failed to fetch`

Check backend first:

```bash
cd backend
uvicorn main:app --reload
```

Open:

```text
http://localhost:8000/docs
```

If backend shows 500, inspect traceback.

### Google API returns 403

Print:

```python
print(response.status_code)
print(response.text)
```

Check:

- API enabled
- API key restrictions
- billing account active
- correct endpoint

### FastAPI returns 422

Request body does not match Pydantic model.

Check `CommuteRequest` and frontend `JSON.stringify()`.

### Python says `return outside function`

Check indentation in service files.

---

## Commit Style

Use Conventional Commits.

Examples:

```bash
feat: add current weather data
feat: generate AI commute recommendations
feat: add transit route comparison
refactor: move commute planning into service layer
style: improve AI recommendation card
fix: handle missing geolocation permission
```

---

## Important Instruction

Do not over-engineer too early.

The current goal is a working portfolio MVP:

1. Real location
2. Real route
3. Real weather
4. AI recommendation
5. Clean UI
6. Clear README

Only after that, add advanced architecture such as multi-agent workflow, model routing, memory, calendar integration, and saved destinations.
