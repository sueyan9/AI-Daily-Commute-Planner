from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from services.google_maps import GoogleMapsService
from services.weather import WeatherService


class PlannerService:
    def __init__(self) -> None:
        self.google_maps = GoogleMapsService()
        self.weather = WeatherService()

    def create_commute_plan(
        self,
        *,
        latitude: float,
        longitude: float,
        destination: str,
        arrival_time: str | None = None,
        preference: str | None = None,
    ) -> dict:
        current_location = self.google_maps.reverse_geocode(latitude, longitude)
        driving_route = None

        if current_location:
            driving_route = self.google_maps.get_driving_route(
                origin=current_location,
                destination=destination,
            )

        weather = self.weather.get_current_weather(latitude, longitude)
        weather_notice = None

        if weather is None:
            weather_notice = "Weather data is temporarily unavailable."

        decision = self._build_decision(
            destination=destination,
            driving_route=driving_route,
            weather=weather,
            weather_notice=weather_notice,
            arrival_time=arrival_time,
            preference=preference,
        )

        return {
            "current_location": current_location,
            "destination": destination,
            "driving_route": driving_route,
            "weather": weather,
            "weather_notice": weather_notice,
            "recommendation": decision["summary"],
            "decision": decision,
        }

    def _build_decision(
        self,
        *,
        destination: str,
        driving_route: dict[str, Any] | None,
        weather: dict[str, Any] | None,
        weather_notice: str | None,
        arrival_time: str | None,
        preference: str | None,
    ) -> dict[str, Any]:
        drive_minutes = self._duration_to_minutes(
            driving_route.get("duration") if driving_route else None
        )
        static_minutes = self._duration_to_minutes(
            driving_route.get("static_duration") if driving_route else None
        )
        leave_time = self._calculate_leave_time(arrival_time, drive_minutes)
        traffic = self._classify_traffic(drive_minutes, static_minutes)
        weather_summary = self._classify_weather(weather)

        factors = [
            {
                "type": "traffic",
                "importance": traffic["importance"],
                "message": traffic["message"],
            },
            {
                "type": "weather",
                "importance": weather_summary["importance"],
                "message": weather_summary["message"],
            },
        ]

        if preference:
            factors.append(
                {
                    "type": "preference",
                    "importance": "low",
                    "message": (
                        f"Preference saved: {preference}. "
                        "This will be applied to route comparisons once transit routing is live."
                    ),
                }
            )

        if weather_notice:
            factors.append(
                {
                    "type": "availability",
                    "importance": "medium",
                    "message": weather_notice,
                }
            )

        headline = self._build_headline(traffic_level=traffic["level"], weather_level=weather_summary["level"])
        reason = self._build_reason(
            traffic_message=traffic["message"],
            weather_message=weather_summary["message"],
            drive_minutes=drive_minutes,
        )

        summary = headline
        if reason:
            summary = f"{headline} {reason}"

        highlights = self._build_highlights(
            drive_minutes=drive_minutes,
            traffic=traffic,
            weather_summary=weather_summary,
        )

        return {
            "recommended_mode": "driving",
            "recommended_label": "Drive",
            "recommended_icon": "🚗",
            "leave_time": leave_time,
            "arrival_time": self._format_time(arrival_time),
            "travel_time_minutes": drive_minutes,
            "traffic": traffic,
            "headline": headline,
            "reason": reason,
            "summary": summary,
            "decision_factors": factors,
            "highlights": highlights,
            "comparison": {
                "title": "Today's Comparison",
                "recommended_mode": "driving",
                "driving": {
                    "label": "Drive",
                    "leave_time": leave_time,
                    "arrival_time": self._format_time(arrival_time),
                    "travel_time_minutes": drive_minutes,
                },
                "transit": {
                    "label": "Public transport",
                    "available": False,
                    "status": "Transit routing is not connected yet.",
                },
            },
            "destination": destination,
        }

    def _build_headline(self, *, traffic_level: str, weather_level: str) -> str:
        if weather_level == "severe":
            return "Drive with extra buffer today."
        if traffic_level == "heavy":
            return "Driving is still the best live route, but traffic is heavy."
        if traffic_level == "moderate":
            return "Driving looks manageable today."
        return "Driving is currently the best available option."

    def _build_reason(
        self,
        *,
        traffic_message: str,
        weather_message: str,
        drive_minutes: int | None,
    ) -> str:
        parts: list[str] = []

        if drive_minutes is not None:
            parts.append(f"The drive is currently around {drive_minutes} minutes.")

        parts.append(traffic_message)
        parts.append(weather_message)

        return " ".join(part for part in parts if part)

    def _build_highlights(
        self,
        *,
        drive_minutes: int | None,
        traffic: dict[str, str],
        weather_summary: dict[str, str],
    ) -> list[dict[str, str]]:
        highlights: list[dict[str, str]] = []

        if drive_minutes is not None:
            highlights.append({"icon": "🚗", "label": f"{drive_minutes} min"})

        highlights.append(
            {
                "icon": "🚦",
                "label": traffic["tag"],
            }
        )
        highlights.append(
            {
                "icon": weather_summary["icon"],
                "label": weather_summary["tag"],
            }
        )

        return highlights

    def _classify_traffic(
        self,
        drive_minutes: int | None,
        static_minutes: int | None,
    ) -> dict[str, str]:
        if drive_minutes is None or static_minutes is None or static_minutes <= 0:
            return {
                "level": "unknown",
                "importance": "medium",
                "message": "Live traffic is included in the driving estimate.",
                "tag": "Live traffic",
            }

        delta_minutes = drive_minutes - static_minutes
        delta_ratio = delta_minutes / static_minutes

        if delta_minutes >= 10 or delta_ratio >= 0.35:
            return {
                "level": "heavy",
                "importance": "high",
                "message": f"Heavy congestion is adding about {delta_minutes} minutes to the drive.",
                "tag": "Heavy traffic",
            }

        if delta_minutes >= 5 or delta_ratio >= 0.15:
            return {
                "level": "moderate",
                "importance": "medium",
                "message": f"Traffic is a little slower than usual, adding about {delta_minutes} minutes.",
                "tag": "Moderate traffic",
            }

        return {
            "level": "normal",
            "importance": "high",
            "message": "Traffic is flowing close to normal conditions.",
            "tag": "Normal traffic",
        }

    def _classify_weather(self, weather: dict[str, Any] | None) -> dict[str, str]:
        if weather is None:
            return {
                "level": "unknown",
                "importance": "medium",
                "message": "Weather data is currently unavailable.",
                "tag": "Weather unavailable",
                "icon": "🌥",
            }

        rain = weather.get("rain") or 0
        precipitation = weather.get("precipitation") or 0
        wind_speed = weather.get("wind_speed") or 0

        if rain >= 3 or precipitation >= 5 or wind_speed >= 35:
            return {
                "level": "severe",
                "importance": "high",
                "message": "Wet or windy conditions may slow the trip and reduce comfort.",
                "tag": "Rough weather",
                "icon": "🌧",
            }

        if rain > 0 or precipitation > 0 or wind_speed >= 25:
            return {
                "level": "mixed",
                "importance": "medium",
                "message": "Conditions are usable, but allow a little extra buffer for weather.",
                "tag": "Some weather",
                "icon": "⛅",
            }

        return {
            "level": "good",
            "importance": "medium",
            "message": "Weather conditions look favourable for the trip.",
            "tag": "Good weather",
            "icon": "🌤",
        }

    def _duration_to_minutes(self, duration: str | None) -> int | None:
        if not duration or not duration.endswith("s"):
            return None

        try:
            return round(int(duration[:-1]) / 60)
        except ValueError:
            return None

    def _calculate_leave_time(
        self,
        arrival_time: str | None,
        travel_minutes: int | None,
    ) -> str | None:
        if not arrival_time or travel_minutes is None:
            return None

        try:
            arrival = datetime.strptime(arrival_time, "%H:%M")
        except ValueError:
            return None

        leave = arrival - timedelta(minutes=travel_minutes)
        return leave.strftime("%-I:%M %p")

    def _format_time(self, value: str | None) -> str | None:
        if not value:
            return None

        try:
            parsed = datetime.strptime(value, "%H:%M")
        except ValueError:
            return value

        return parsed.strftime("%-I:%M %p")
