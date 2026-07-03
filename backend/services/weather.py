from __future__ import annotations

from typing import Any

import requests

from core.config import settings


class WeatherService:
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    def get_current_weather(
        self,
        latitude: float,
        longitude: float,
    ) -> dict[str, Any] | None:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": (
                "temperature_2m,"
                "apparent_temperature,"
                "precipitation,"
                "rain,"
                "weather_code,"
                "wind_speed_10m"
            ),
            "timezone": "auto",
        }

        try:
            response = requests.get(
                self.BASE_URL,
                params=params,
                timeout=settings.WEATHER_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
        except requests.RequestException:
            return None

        data = response.json()
        current = data.get("current", {})

        return {
            "temperature": current.get("temperature_2m"),
            "feels_like": current.get("apparent_temperature"),
            "precipitation": current.get("precipitation"),
            "rain": current.get("rain"),
            "weather_code": current.get("weather_code"),
            "wind_speed": current.get("wind_speed_10m"),
        }
