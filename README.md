# 🚗 LeaveWise

> **An AI-powered daily commute assistant that helps you decide when to leave and how to travel every morning.**

Instead of checking Google Maps, the weather, and public transport separately, LeaveWise automatically combines all the information and provides one simple recommendation:

> **"Leave home at 7:38 AM and take the NX1 Express today."**

---

## ✨ Why LeaveWise?

Most navigation apps tell you **how to get somewhere**.

LeaveWise helps you decide:

- 🚗 Should I drive today?
- 🚌 Should I take public transport?
- ⏰ What time should I leave?
- 🌧 Will the weather affect my commute?
- 🚧 Is today's congestion caused by rush hour or an accident?

The goal is to reduce the amount of information users need to process every morning and provide a clear AI-powered recommendation.

---

# 📱 Features

### 📍 Automatic Location Detection

The application automatically detects the user's current location using the browser's Geolocation API.

No need to manually enter your starting point every day.

---

### 🎯 Destination Selection

Choose your destination from:

- Office
- Home
- Saved locations

Future versions will automatically suggest destinations based on your daily routine.

---

### 🚦 Live Traffic Analysis

Retrieve live traffic information from Google Maps.

The application compares:

- Driving
- Public Transport
- Walking
- Cycling

---

### 🌤 Weather Analysis

Retrieve current weather conditions including:

- Temperature
- Rain forecast
- Wind
- Weather alerts

---

### 🤖 AI Recommendation

Instead of displaying raw traffic data, the AI explains:

- Why traffic is heavy
- Whether congestion is caused by an accident or peak-hour traffic
- Whether weather affects today's commute
- Which transport option is recommended
- The ideal departure time

Example:

> Leave home at **7:38 AM**.
>
> Traffic on SH1 is currently heavier than usual due to an accident near Onewa Road.
>
> Taking the NX1 Express is expected to save approximately 18 minutes compared with driving.
>
> Rain is forecast to begin in 20 minutes, so leaving slightly earlier is recommended.

---

# 🏗 Architecture

```
Next.js Frontend
        │
        ▼
FastAPI Backend
        │
        ▼
Planner Service
        │
 ┌──────────────┐
 │ Google Maps  │
 │ OpenWeather  │
 │ AI Model     │
 └──────────────┘
        │
        ▼
 AI Recommendation
```

---

# 🛠 Tech Stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS

## Backend

- FastAPI
- Python

## APIs

- Google Maps Directions API
- Google Geolocation API
- OpenWeather API

## AI

- OpenAI GPT
- DeepSeek
- (Future) Multi-Agent Architecture

---

# 🚀 Future Roadmap

## Phase 1 (Current)

- Responsive Web UI
- Current location detection
- Destination input
- Google Maps integration
- Weather integration
- AI commute recommendation

---

## Phase 2

- Google Calendar integration
- Daily routine detection
- Saved locations
- Push notifications

---

## Phase 3

- Multi-Agent workflow
- Model routing
- Public transport delay analysis
- Personalized commuting preferences

---

# 💡 Project Goal

LeaveWise is designed as an AI-first daily commuting assistant rather than another navigation application.

The project demonstrates how Large Language Models can combine multiple real-time data sources and generate human-friendly recommendations that help users make better daily commuting decisions.
