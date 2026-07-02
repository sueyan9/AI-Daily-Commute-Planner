# 🚗 LeaveWise

> **An AI-powered daily commute assistant that helps you decide when to leave and how to travel every morning.**

Instead of switching between Google Maps, weather forecasts, and public transport apps, LeaveWise combines multiple real-time data sources and provides one simple recommendation.

> **"Leave home at 7:38 AM and take the NX1 Express today."**

---

# ✨ Why LeaveWise?

Most navigation apps answer:

> **"How do I get there?"**

LeaveWise answers:

> **"What is the smartest way to commute today?"**

Every morning, the application automatically:

- 📍 Detects your current location
- 🌤 Checks the latest weather
- 🚦 Analyses live traffic conditions
- 🚌 Compares driving and public transport
- 🤖 Explains *why* it recommends a particular option
- ⏰ Suggests the best departure time

The goal is not to replace Google Maps.

The goal is to help users make better commuting decisions.

---

# 📱 Current Features

### ✅ Browser Geolocation

Automatically retrieves the user's current location using the browser Geolocation API.

No need to manually enter your starting location every day.

---

### ✅ Responsive Web Interface

A modern mobile-first interface built with Next.js and Tailwind CSS.

Designed to feel like a consumer AI application rather than a traditional dashboard.

---

### ✅ FastAPI Backend

RESTful backend service built with FastAPI.

Current architecture separates:

- API layer
- Planner service
- Agent layer
- External tools

to make future AI integration easier.

---

### ✅ Frontend ↔ Backend Communication

The frontend communicates with the FastAPI backend using REST APIs.

This establishes the foundation for integrating real-time services.

---

# 🚧 In Development

The following features are currently being implemented.

## 📍 Reverse Geocoding

Convert GPS coordinates into a human-readable location.

Example:

```
Latitude:
-36.8208

↓

Albany, Auckland
```

---

## 🚗 Google Maps Directions API

Retrieve live travel information for:

- Driving
- Public Transport
- Walking
- Cycling

---

## 🌤 Weather Analysis

Retrieve:

- Temperature
- Rain forecast
- Wind
- Weather alerts

---

## 🤖 AI Recommendation Engine

Instead of displaying raw traffic information, the AI explains:

- Why congestion exists
- Whether delays are caused by accidents or rush hour
- Whether weather affects today's commute
- Which transport option is recommended
- Why that recommendation was made

Example:

> Leave home at **7:38 AM**.
>
> Traffic on SH1 is currently heavier than usual due to an accident near Onewa Road.
>
> Taking the NX1 Express is expected to save approximately 18 minutes compared with driving.
>
> Rain is forecast to begin in 20 minutes, so leaving slightly earlier is recommended.

---

# 🏗 System Architecture

```

Next.js Frontend
│
▼
FastAPI Backend
│
▼
Planner Service
│
├───────────────┐
│ Google Maps │
│ OpenWeather │
│ AI Models │
└───────────────┘
│
▼
AI Recommendation

```

Future versions will evolve this architecture into an Agent-based workflow where each external service is encapsulated as an independent Tool.

---

# 🛠 Tech Stack

## Frontend

- Next.js 15
- React
- TypeScript
- Tailwind CSS

## Backend

- FastAPI
- Python

## Current APIs

- Browser Geolocation API

## Planned APIs

- Google Maps Geocoding API
- Google Maps Directions API
- OpenWeather API

## AI Models

- OpenAI GPT
- DeepSeek
- (Future) Model Routing

---

# 📅 Development Progress

## ✅ Completed

- [x] Project architecture
- [x] Responsive UI
- [x] Hero landing page
- [x] Commute planning interface
- [x] Recommendation card
- [x] FastAPI backend
- [x] REST API
- [x] Frontend ↔ Backend connection
- [x] Browser Geolocation

---

## 🚧 Current Sprint

- [ ] Reverse Geocoding
- [ ] Google Directions API
- [ ] Weather API

---

## 🔜 Next Sprint

- [ ] AI Recommendation
- [ ] Traffic explanation
- [ ] Public transport comparison
- [ ] Departure time optimisation

---

## 🔮 Future

- Google Calendar integration
- Saved destinations
- Daily commuting routine
- Push notifications
- Multi-Agent workflow
- Model routing
- User preference learning

---

# 💡 Project Goal

LeaveWise is designed as an AI-first commuting assistant rather than another navigation application.

Instead of simply showing maps or routes, LeaveWise combines multiple real-time data sources and uses AI to explain the best commuting decision in a clear, human-friendly way.

The project also serves as a practical exploration of Agentic AI architecture, demonstrating how modern AI applications can orchestrate external tools, analyse live data, and generate contextual recommendations.