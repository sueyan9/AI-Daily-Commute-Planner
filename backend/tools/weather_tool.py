from __future__ import annotations

from typing import Any

from services.weather import WeatherService

WEATHER_TOOL = {
    "name": "get_current_weather",
    "description": (
        "Get current weather at the user's location: temperature, feels-like, "
        "precipitation, rain, and wind speed."
    ),
    "parameters": {
        "type": "object",
        "properties": {},
        "required": [],
    },
}


def run_weather(
    weather: WeatherService,
    *,
    latitude: float,
    longitude: float,
) -> dict[str, Any]:
    result = weather.get_current_weather(latitude, longitude)

    if result is None:
        return {"error": "Weather data is temporarily unavailable."}

    return result
