# AGENTS.md — LeaveWise Development Guide

## Project Overview

LeaveWise is an AI-powered daily commute assistant. It helps a user decide **when to leave** and **how to travel** every morning by combining:

- Browser geolocation
- Google Geocoding API
- Google Routes API
- Open-Meteo weather data
- AI recommendation logic

The product is not a travel planning app. It is a daily life assistant for commuting decisions.

Core user question:

> Should I drive, take public transport, or leave earlier today?

---

## Current Tech Stack

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
- Planned: OpenAI / DeepSeek API

---

## Current Development Status

Completed:

- Responsive single-page UI
- FastAPI backend
- Frontend-to-backend connection
- Browser geolocation
- Reverse geocoding
- Google Routes API driving estimate
- Open-Meteo current weather integration

In progress:

- AI recommendation generation
- Public transport comparison
- Replacing static UI sections with real API data

---

## High-Level Architecture

```text
Next.js Frontend
        │
        ▼
FastAPI Backend
        │
        ▼
Planner Service
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

## Backend Structure

Expected backend structure:

```text
backend/
├── api/
│   └── commute.py
├── core/
│   └── config.py
├── services/
│   ├── google_maps.py
│   ├── weather.py
│   └── llm.py          # planned
├── agents/
│   └── commute_agent.py # planned
├── tools/
├── main.py
├── .env
└── .env.example
```

### Responsibilities

#### `api/`

FastAPI route layer only. It should receive requests and return responses. Avoid putting business logic here.

#### `services/`

External API integrations and service wrappers.

Examples:

- `google_maps.py` handles Geocoding and Routes API.
- `weather.py` handles Open-Meteo.
- `llm.py` should handle OpenAI or DeepSeek calls.

#### `agents/`

AI decision-making logic. This layer should decide how to combine route, weather, and user preference data into a final recommendation.

#### `core/config.py`

Centralised environment configuration. Do not call `load_dotenv()` in every service file.

---

## Environment Variables

Use `backend/.env` locally.

Never commit real API keys.

Example:

```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
OPENAI_API_KEY=your_openai_api_key
DEEPSEEK_API_KEY=your_deepseek_api_key
```

Commit only `backend/.env.example`.

---

## API Design

Current main endpoint:

```http
POST /commute/plan
```

Expected request:

```json
{
  "latitude": -36.82,
  "longitude": 174.61,
  "destination": "Auckland CBD, Auckland, New Zealand"
}
```

Expected response shape:

```json
{
  "current_location": "23 Saint Catherine Crescent, West Harbour, Auckland 0618, New Zealand",
  "destination": "Auckland CBD, Auckland, New Zealand",
  "driving_route": {
    "duration": "1250s",
    "distance_meters": 19052
  },
  "weather": {
    "temperature": 12.5,
    "feels_like": 10.8,
    "precipitation": 0,
    "rain": 0,
    "weather_code": 3,
    "wind_speed": 15.2
  },
  "recommendation": "Leave now by car. Driving is estimated to take about 21 minutes and the weather is currently suitable for driving."
}
```

---

## AI Recommendation Requirements

The AI recommendation should be short, practical, and decision-focused.

It should answer:

- Should the user drive or use public transport?
- Should the user leave now or later?
- Is weather affecting the commute?
- Is traffic likely to affect departure time?

Style:

- Friendly
- Clear
- Not too verbose
- No unnecessary technical details

Example output:

```text
Leave now by car. Driving is estimated to take about 21 minutes, and current weather conditions are mild with light wind. There is no strong weather reason to avoid driving today.
```

Avoid:

- Long essays
- Unverified claims about accidents unless supported by API data
- Saying the system knows public transport status before that feature exists

---

## Frontend Development Rules

The frontend should remain a single-page consumer-style app.

Design direction:

- Mobile-first
- Soft pastel gradient background
- Glassmorphism cards
- Rounded corners
- Clear daily recommendation
- Not a technical dashboard

Avoid:

- Dense tables
- Enterprise dashboard look
- Dark cyberpunk UI
- Too many controls

Current key files:

```text
frontend/app/components/HomeClient.tsx
frontend/app/components/Hero.tsx
frontend/app/components/CommuteForm.tsx
frontend/app/components/RecommendationCard.tsx
frontend/app/components/InfoCards.tsx
frontend/app/hooks/useGeolocation.ts
```

---

## Development Priorities

Recommended order:

1. Keep current real data flow stable.
2. Add AI recommendation using DeepSeek or OpenAI.
3. Display recommendation in the UI.
4. Add transit route comparison.
5. Replace static cards with real driving/weather/recommendation data.
6. Refactor API logic into `PlannerService`.
7. Add user preferences and saved destinations.

---

## Commit Message Style

Use Conventional Commits.

Examples:

```bash
feat: add browser geolocation support
feat: add reverse geocoding for current location
feat: integrate Google Routes API for driving estimates
feat: add current weather data
feat: generate AI commute recommendations
style: improve commute summary UI
refactor: move commute logic into planner service
fix: handle missing location permission
```

---

## Important Notes for AI Assistants

When helping with this project:

1. Do not suggest large rewrites unless necessary.
2. Prefer small vertical slices that run end-to-end.
3. Keep API keys in the backend only.
4. Do not expose Google/OpenAI/DeepSeek keys to the frontend.
5. Do not add mock data unless explicitly requested.
6. Prefer real API integration, but keep cost awareness in mind.
7. When debugging frontend `Failed to fetch`, always check backend logs first.
8. When Google APIs fail, inspect `response.text` before guessing.
9. Keep the product positioned as a daily commute assistant, not a tourism app.
10. Prioritise usable portfolio-quality code over over-engineered architecture.
