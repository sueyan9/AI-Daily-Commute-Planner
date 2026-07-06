# 🚗 LeaveWise

> **An AI-powered daily commute assistant that helps you decide when to leave and how to travel every morning.**

Instead of switching between Google Maps, weather forecasts, and public transport apps, LeaveWise combines real-time data sources with Claude to give you one simple recommendation.

> **"Drive today. Traffic is light and you'll save about 33 minutes compared with public transport."**

---

# ✨ Why LeaveWise?

Most navigation apps answer:

> **"How do I get there?"**

LeaveWise answers:

> **"What is the smartest way to commute today?"**

Every time you open it, the application:

- 📍 Detects your current location
- 🌤 Checks the latest weather and adapts the background scene to match it
- 🚦 Analyses live driving traffic
- 🚌 Compares driving against public transport, including transfers
- 🤖 Has Claude explain *why* it recommends a particular option, in one sentence
- ⏰ Suggests the best departure time to make your arrival deadline

The goal is not to replace Google Maps.

The goal is to help users make better commuting decisions with less reading.

---

# 📱 Current Features

### ✅ Browser Geolocation

Automatically retrieves the user's current location using the browser Geolocation API. No need to manually enter your starting location every day.

---

### ✅ Reverse Geocoding & Driving Routes

Converts GPS coordinates into a human-readable address, then retrieves live driving duration, distance, and traffic-aware timing via the Google Routes API.

---

### ✅ Public Transport Routing

Uses the Google Routes API in `TRANSIT` mode to find real multi-leg public transport options — including transfers, not just direct routes — with live departure/arrival times and travel duration.

An earlier version matched only direct routes against Auckland Transport's raw GTFS feed, which meant most real commutes (anything needing a transfer) came back as "no service available." Google Transit routing replaced that as the primary source. The AT GTFS-Realtime integration (`backend/services/auckland_transport.py`) is still in the codebase, currently dormant, earmarked for a future phase to overlay live delay/service-alert data on top of the Google-provided route.

---

### ✅ Live Weather

Retrieves current temperature, rain, and wind from Open-Meteo (no API key required).

---

### ✅ AI Recommendation (Claude)

A rule-based decision engine picks the recommended mode (drive vs. transit), the best leave time, and classifies traffic/weather severity from the real data above. Claude (`claude-haiku-4-5`) then explains that decision in a single, practical sentence — it explains the decision that's already been made, it doesn't get to override it, and it's instructed never to invent traffic incidents or delays that aren't in the data.

If the LLM call fails or isn't configured, the app falls back to a plain-text summary built from the same rule engine, so the app never breaks — it just loses the natural-language polish.

Provider is swappable via `LLM_PROVIDER` (`anthropic` / `openai` / `deepseek`) in `backend/.env`.

---

### ✅ Weather-Reactive UI

A full-bleed background photo that changes with real conditions: clear, cloudy/windy, rainy, or foggy (matched against actual Open-Meteo data, including WMO fog codes), plus a day/night tint and an animated rain overlay when it's actually raining. Users can also upload their own background photo.

---

### ✅ Saved Locations & Returning-User Auto-Plan

Home/Work/etc. locations are saved to `localStorage` and selectable from a dropdown instead of retyping every time. If you've planned a commute before, the app remembers your last destination/arrival time/preference and automatically re-plans as soon as your location is available — no input required to see today's recommendation.

---

### ✅ Responsive Web Interface

A glassmorphic, mobile-first interface built with Next.js and Tailwind CSS: a compact search/filter bar up top, an AI recommendation hero card, side-by-side (desktop) or stacked (mobile) comparison cards for drive vs. transit, and a collapsible "why this recommendation" breakdown.

---

# 🏗 System Architecture

```
Next.js Frontend
        │
        ▼
FastAPI Backend (api/commute.py)
        │
        ▼
Planner Service (services/planner.py)
        │
 ┌──────────────────────┐
 │ Google Routes API     │  driving + transit routing
 │ Open-Meteo            │  weather
 │ Claude (Anthropic)    │  recommendation explanation
 └──────────────────────┘
        │
        ▼
Commute Plan JSON → UI
```

`api/commute.py` stays thin and delegates everything to `services/planner.py`, which composes `services/google_maps.py`, `services/weather.py`, and `services/llm.py`. Each external API has its own service wrapper; the planner never talks to a third-party API directly.

---

# 🛠 Tech Stack

## Frontend

- Next.js 16 (App Router, Turbopack)
- React 19
- TypeScript
- Tailwind CSS v4

## Backend

- FastAPI
- Python

## APIs in use

- Browser Geolocation API
- Google Geocoding API
- Google Routes API (driving + transit)
- Open-Meteo Weather API
- Anthropic Claude API (default LLM provider; OpenAI and DeepSeek supported as drop-in alternatives)

## Dormant / reserved for later

- Auckland Transport GTFS + Realtime (`services/auckland_transport.py`) — for delay/service-alert enrichment on top of Google Transit routes

---

# 📅 Development Progress

## ✅ Completed

- [x] Project architecture (thin API layer → planner service → external service wrappers)
- [x] Responsive, glassmorphic UI
- [x] FastAPI backend with CORS for local dev
- [x] Browser geolocation
- [x] Reverse geocoding
- [x] Driving route + live traffic (Google Routes API)
- [x] Public transport routing with transfers (Google Routes API, TRANSIT mode)
- [x] Current weather (Open-Meteo)
- [x] Rule-based commute decision engine (mode choice, leave time, traffic/weather classification)
- [x] AI-generated recommendation explanation (Claude, with OpenAI/DeepSeek as swappable providers)
- [x] Weather- and time-of-day-reactive background scene
- [x] Saved locations + returning-user auto-plan

---

## 🔮 Future

- Live delay/service-alert overlay using the dormant Auckland Transport GTFS-Realtime integration
- Natural-language input ("Need to be at AUT by 9am" → auto-filled destination/time)
- Google Calendar integration
- Push notifications
- Multi-agent workflow / model routing (Claude vs. DeepSeek vs. OpenAI A/B comparison)
- User preference learning

---

# 💡 Project Goal

LeaveWise uses a lightweight multi-agent workflow:

- A Data Agent gathers and normalises live traffic, transit, and weather data.
- A Decision Agent evaluates the structured data and selects the best commute option.
- A Narration Agent explains the recommendation in clear, human-friendly language.