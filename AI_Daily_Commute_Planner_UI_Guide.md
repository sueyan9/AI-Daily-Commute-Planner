# AI Daily Commute Planner UI Design Guide

## 1. Product Direction

Build a modern single-page AI Daily Commute Planner web application.

The design should feel like a premium consumer travel / weather / maps app, not an enterprise dashboard.

Target feeling:

> The interface should feel like an app people enjoy opening every morning, not software they use for work.

## 2. Design References

Use the following design direction:

- Apple Weather
- Google Maps
- Flighty
- Airbnb
- Trip.com
- Google Material 3
- Apple Human Interface Guidelines

Avoid:

- Enterprise dashboard
- Dark monitoring dashboard
- Cyberpunk style
- Hacker style
- Admin panel
- Dense data table layout
- Terminal style
- Neon green
- Industrial / military interface

## 3. Visual Style

Use:

- Soft pastel gradients
- Bright and airy background
- Glassmorphism cards
- Large rounded corners: 20px–28px
- White translucent panels
- Soft shadows
- Minimal line icons
- Large friendly typography
- Plenty of whitespace
- Mobile-first layout
- One clear primary action

## 4. Color Palette

### Background

Soft gradient:

```css
linear-gradient(135deg, #DFF3FF 0%, #E8E6FF 48%, #FFE2C4 100%)
```

### Primary

```css
#6C7BFF
```

### Secondary

```css
#8FD3FE
```

### Accent

```css
#FFC58F
```

### Surface / Card

```css
rgba(255, 255, 255, 0.65)
```

### Main Text

```css
#1F2937
```

### Muted Text

```css
#6B7280
```

### Success / Good Status

```css
#16A34A
```

### Warning / Delay

```css
#F97316
```

## 5. Recommended Page Layout

Single page layout:

```text
AI Daily Commute Planner
Good morning, Morgan 👋
Weather pill / Current time

Input Card
- From
- To
- Departure time
- Preference
- Plan My Commute button

Recommendation Card
- Best route
- NX1 Express
- Britomart → Albany Station
- ETA
- Arrival time
- Transfers
- Recommendation reason

Status Cards
- Traffic
- Weather
- Alternative routes

Final Recommendation Bar
Leave home at 7:38 AM.
```

## 6. UI Generation Prompt

Use this prompt when asking AI to generate or redesign the UI:

```text
Design a modern single-page AI Daily Commute Planner web application.

The design should look like a premium consumer travel app rather than an enterprise dashboard.

Style reference:
- Apple Human Interface Guidelines
- Airbnb
- Google Material 3
- Travel planning apps
- Flight booking apps
- Weather apps

Visual style:
- Soft pastel gradients
- Bright and airy
- Glassmorphism cards
- Rounded corners 20–28px
- White translucent panels
- Large typography
- Minimal icons
- Plenty of whitespace
- Elegant illustrations
- Smooth shadows
- Mobile-first responsive design

Color palette:
Background: soft sky blue to lavender to warm sunset gradient
Primary: #6C7BFF
Secondary: #8FD3FE
Accent: #FFC58F
Surface: rgba(255,255,255,0.65)
Text: #1F2937

Avoid:
- Dark mode
- Hacker style
- Enterprise dashboard
- Dense tables
- Technical UI
- Neon green
- Cyberpunk
- Military interface
- Data center aesthetics

Layout:
Top hero with product name, greeting and weather.
Input card with origin, destination, departure time and preferences.
Primary CTA button: Plan My Commute.
Recommendation card showing best route, ETA, arrival time, transfers and reason.
Status cards for traffic, weather and alternative routes.
Bottom recommendation bar showing: Leave home at 7:38 AM.

The interface should feel like an app people enjoy opening every morning, not software they use for work.
```

## 7. Cursor / Claude Code Prompt

```text
Redesign the current frontend as a single-page responsive web app for AI Daily Commute Planner.

Target audience: everyday commuters.

Design language: premium consumer mobile app.

Not a dashboard. Not enterprise. Not analytics. Not cyberpunk.

Think Apple Weather, Google Maps, Flighty, Airbnb and Trip.com.

Use large cards, rounded corners, soft gradients, pastel colors, glassmorphism, simple icons, lots of whitespace, friendly typography, one primary action and minimal navigation.

Implement the page in Next.js with Tailwind CSS.
Create a mobile-first layout that also looks good on desktop.
Use mock data first. Do not connect real APIs yet.
```

## 8. First Frontend Build Scope

For the first version, build only:

- One landing page / app page
- Static mock data
- Form fields
- Result cards
- Mobile responsive layout

Do not add yet:

- Real Google Maps API
- Auckland Transport API
- Login
- Database
- Calendar integration
- Real AI agent

