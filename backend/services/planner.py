from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from services.google_maps import GoogleMapsService
from services.llm import LLMService
from services.weather import WeatherService


class PlannerService:
    def __init__(self) -> None:
        self.google_maps = GoogleMapsService()
        self.weather = WeatherService()
        self.llm = LLMService()

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
        destination_location = self.google_maps.geocode_address(destination)
        transit_route = None

        if current_location:
            driving_route = self.google_maps.get_driving_route(
                origin=current_location,
                destination=destination,
            )

        if destination_location:
            transit_route = self.google_maps.get_transit_route(
                origin_latitude=latitude,
                origin_longitude=longitude,
                destination_latitude=destination_location["latitude"],
                destination_longitude=destination_location["longitude"],
            )

        weather = self.weather.get_current_weather(latitude, longitude)
        weather_notice = None

        if weather is None:
            weather_notice = "Weather data is temporarily unavailable."

        decision = self._build_decision(
            destination=destination,
            driving_route=driving_route,
            transit_route=transit_route,
            weather=weather,
            weather_notice=weather_notice,
            arrival_time=arrival_time,
            preference=preference,
        )

        llm_summary = self.llm.generate_commute_recommendation(
            current_location=current_location,
            destination=destination,
            driving_route=driving_route,
            transit_route=transit_route,
            weather=weather,
            recommended_mode=decision["recommended_mode"],
        )
        if llm_summary:
            decision["reason"] = llm_summary
            decision["summary"] = llm_summary

        return {
            "current_location": current_location,
            "destination": destination,
            "driving_route": driving_route,
            "transit_route": transit_route,
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
        transit_route: dict[str, Any] | None,
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
        transit_minutes = (
            transit_route.get("travel_time_minutes")
            if transit_route and transit_route.get("available")
            else None
        )
        recommended_mode = self._choose_mode(
            drive_minutes=drive_minutes,
            traffic_level=traffic["level"],
            transit_route=transit_route,
            preference=preference,
        )
        recommended_label = "Public transport" if recommended_mode == "transit" else "Drive"
        recommended_icon = "🚌" if recommended_mode == "transit" else "🚗"
        recommended_leave_time = (
            transit_route.get("departure_time")
            if recommended_mode == "transit" and transit_route
            else leave_time
        )
        recommended_arrival_time = (
            transit_route.get("arrival_time")
            if recommended_mode == "transit" and transit_route
            else self._format_time(arrival_time)
        )
        recommended_travel_minutes = transit_minutes if recommended_mode == "transit" else drive_minutes

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
                    "message": f"Preference applied: {preference}.",
                }
            )

        if transit_route and transit_route.get("available"):
            factors.append(
                {
                    "type": "transit",
                    "importance": "medium",
                    "message": transit_route["status"],
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

        headline = self._build_headline(
            traffic_level=traffic["level"],
            weather_level=weather_summary["level"],
            recommended_mode=recommended_mode,
        )
        reason = self._build_reason(
            recommended_mode=recommended_mode,
            traffic_message=traffic["message"],
            weather_message=weather_summary["message"],
            drive_minutes=drive_minutes,
            transit_route=transit_route,
        )

        summary = headline
        if reason:
            summary = f"{headline} {reason}"

        highlights = self._build_highlights(
            drive_minutes=drive_minutes,
            transit_minutes=transit_minutes,
            traffic=traffic,
            weather_summary=weather_summary,
            recommended_mode=recommended_mode,
        )

        return {
            "recommended_mode": recommended_mode,
            "recommended_label": recommended_label,
            "recommended_icon": recommended_icon,
            "leave_time": recommended_leave_time,
            "arrival_time": recommended_arrival_time,
            "travel_time_minutes": recommended_travel_minutes,
            "traffic": traffic,
            "headline": headline,
            "reason": reason,
            "summary": summary,
            "decision_factors": factors,
            "highlights": highlights,
            "comparison": {
                "title": "Today's Comparison",
                "recommended_mode": recommended_mode,
                "driving": {
                    "label": "Drive",
                    "leave_time": leave_time,
                    "arrival_time": self._format_time(arrival_time),
                    "travel_time_minutes": drive_minutes,
                },
                "transit": {
                    "label": "Public transport",
                    "available": bool(transit_route and transit_route.get("available")),
                    "status": transit_route["status"] if transit_route else "Transit data is unavailable.",
                    "route_label": transit_route.get("route_label") if transit_route else None,
                    "departure_time": transit_route.get("departure_time") if transit_route else None,
                    "arrival_time": transit_route.get("arrival_time") if transit_route else None,
                    "travel_time_minutes": transit_minutes,
                    "next_departures": transit_route.get("next_departures", []) if transit_route else [],
                },
            },
            "destination": destination,
        }

    def _build_headline(
        self,
        *,
        traffic_level: str,
        weather_level: str,
        recommended_mode: str,
    ) -> str:
        if recommended_mode == "transit":
            if weather_level == "severe":
                return "Public transport is the safer call today."
            return "Public transport looks like the better live option."
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
        recommended_mode: str,
        traffic_message: str,
        weather_message: str,
        drive_minutes: int | None,
        transit_route: dict[str, Any] | None,
    ) -> str:
        parts: list[str] = []

        if recommended_mode == "transit" and transit_route and transit_route.get("available"):
            route_label = transit_route.get("route_label") or "public transport"
            departure_time = transit_route.get("departure_time")
            travel_time = transit_route.get("travel_time_minutes")
            status = transit_route.get("status")

            if departure_time:
                parts.append(f"Catch {route_label} at {departure_time}.")
            if travel_time is not None:
                parts.append(f"The trip is currently around {travel_time} minutes.")
            if status:
                parts.append(status)
        elif drive_minutes is not None:
            parts.append(f"The drive is currently around {drive_minutes} minutes.")

        if recommended_mode == "driving":
            parts.append(traffic_message)
        parts.append(weather_message)

        return " ".join(part for part in parts if part)

    def _build_highlights(
        self,
        *,
        drive_minutes: int | None,
        transit_minutes: int | None,
        traffic: dict[str, str],
        weather_summary: dict[str, str],
        recommended_mode: str,
    ) -> list[dict[str, str]]:
        highlights: list[dict[str, str]] = []

        if recommended_mode == "transit" and transit_minutes is not None:
            highlights.append({"icon": "🚌", "label": f"{transit_minutes} min transit"})
        elif drive_minutes is not None:
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

    def _choose_mode(
        self,
        *,
        drive_minutes: int | None,
        traffic_level: str,
        transit_route: dict[str, Any] | None,
        preference: str | None,
    ) -> str:
        if not transit_route or not transit_route.get("available"):
            return "driving"

        transit_minutes = transit_route.get("travel_time_minutes")
        preference_value = (preference or "").strip().lower()

        if drive_minutes is None:
            return "transit"

        if preference_value == "fastest route":
            return "transit" if transit_minutes is not None and transit_minutes < drive_minutes else "driving"

        if preference_value == "fewer transfers":
            if transit_minutes is not None and transit_minutes <= drive_minutes + 10:
                return "transit"

        if traffic_level == "heavy" and transit_minutes is not None and transit_minutes <= drive_minutes + 12:
            return "transit"

        return "driving"

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
