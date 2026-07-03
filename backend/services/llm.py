from __future__ import annotations

import json
from typing import Any

import requests

from core.config import settings


class LLMService:
    OPENAI_URL = "https://api.openai.com/v1/chat/completions"
    DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

    def generate_commute_recommendation(
        self,
        *,
        current_location: str | None,
        destination: str,
        driving_route: dict[str, Any] | None,
        weather: dict[str, Any] | None,
    ) -> str:
        if not settings.LLM_ENABLED:
            return self._fallback_recommendation(driving_route, weather)

        provider = settings.LLM_PROVIDER

        if provider == "deepseek":
            api_key = settings.DEEPSEEK_API_KEY
            model = settings.DEEPSEEK_MODEL
            base_url = self.DEEPSEEK_URL
        else:
            api_key = settings.OPENAI_API_KEY
            model = settings.OPENAI_MODEL
            base_url = self.OPENAI_URL

        if not api_key:
            return self._fallback_recommendation(driving_route, weather)

        messages = self._build_messages(
            current_location=current_location,
            destination=destination,
            driving_route=driving_route,
            weather=weather,
        )

        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.3,
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        try:
            response = requests.post(
                base_url,
                json=payload,
                headers=headers,
                timeout=settings.LLM_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
        except requests.RequestException:
            return self._fallback_recommendation(driving_route, weather)

        data = response.json()
        choices = data.get("choices") or []
        if not choices:
            return self._fallback_recommendation(driving_route, weather)

        message = choices[0].get("message") or {}
        content = (message.get("content") or "").strip()

        return content or self._fallback_recommendation(driving_route, weather)

    def _build_messages(
        self,
        *,
        current_location: str | None,
        destination: str,
        driving_route: dict[str, Any] | None,
        weather: dict[str, Any] | None,
    ) -> list[dict[str, str]]:
        system_prompt = (
            "You are LeaveWise, an AI daily commute assistant. "
            "Give a short, practical commute recommendation. "
            "Focus on whether the user should drive today and whether they should leave now or soon. "
            "Do not mention public transport availability unless transit data is provided. "
            "Keep the answer under 70 words and avoid technical jargon."
        )

        commute_context = {
            "current_location": current_location,
            "destination": destination,
            "driving_route": driving_route,
            "weather": weather,
        }

        user_prompt = (
            "Use the commute data below to write one short recommendation for the user.\n\n"
            f"{json.dumps(commute_context, ensure_ascii=True, indent=2)}\n\n"
            "Rules:\n"
            "- Base the answer only on the provided commute data.\n"
            "- Mention driving time if it is available.\n"
            "- Mention weather impact only if it materially affects the commute.\n"
            "- Do not claim public transport is better unless transit data is provided.\n"
            "- Keep it concise and practical."
        )

        return [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

    def _fallback_recommendation(
        self,
        driving_route: dict[str, Any] | None,
        weather: dict[str, Any] | None,
    ) -> str:
        duration_minutes = self._duration_to_minutes(
            driving_route.get("duration") if driving_route else None
        )
        rain = weather.get("rain") if weather else None
        wind_speed = weather.get("wind_speed") if weather else None

        parts = []

        if duration_minutes is not None:
            parts.append(f"Driving is estimated to take about {duration_minutes} minutes.")

        if rain and rain > 0:
            parts.append("There is some rain, so leaving a bit earlier is sensible.")
        elif wind_speed is not None and wind_speed >= 30:
            parts.append("It is quite windy, so allow a little extra travel buffer.")
        elif weather is None:
            parts.append("Weather data is temporarily unavailable, so this advice is based on route data only.")
        else:
            parts.append("Current weather does not show a strong reason to avoid driving.")

        return "Leave now by car. " + " ".join(parts)

    def _duration_to_minutes(self, duration: str | None) -> int | None:
        if not duration or not duration.endswith("s"):
            return None

        try:
            return round(int(duration[:-1]) / 60)
        except ValueError:
            return None
