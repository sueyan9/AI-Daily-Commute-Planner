from __future__ import annotations

import json
from typing import Any

import requests

from core.config import settings


class LLMService:
    OPENAI_URL = "https://api.openai.com/v1/chat/completions"
    DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
    ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
    ANTHROPIC_VERSION = "2023-06-01"

    def generate_commute_recommendation(
        self,
        *,
        current_location: str | None,
        destination: str,
        driving_route: dict[str, Any] | None,
        transit_route: dict[str, Any] | None,
        weather: dict[str, Any] | None,
        recommended_mode: str,
    ) -> str | None:
        """Returns an LLM-phrased recommendation, or None if the LLM is disabled,
        unconfigured, or the request fails. Callers should fall back to their own
        rule-based summary in that case, since it already reflects recommended_mode."""
        if not settings.LLM_ENABLED:
            return None

        system_prompt, user_prompt = self._build_prompts(
            current_location=current_location,
            destination=destination,
            driving_route=driving_route,
            transit_route=transit_route,
            weather=weather,
            recommended_mode=recommended_mode,
        )

        provider = settings.LLM_PROVIDER

        if provider == "anthropic":
            return self._call_anthropic(system_prompt, user_prompt)
        elif provider == "deepseek":
            return self._call_openai_compatible(
                system_prompt,
                user_prompt,
                api_key=settings.DEEPSEEK_API_KEY,
                model=settings.DEEPSEEK_MODEL,
                base_url=self.DEEPSEEK_URL,
            )
        else:
            return self._call_openai_compatible(
                system_prompt,
                user_prompt,
                api_key=settings.OPENAI_API_KEY,
                model=settings.OPENAI_MODEL,
                base_url=self.OPENAI_URL,
            )

    def _call_anthropic(self, system_prompt: str, user_prompt: str) -> str | None:
        api_key = settings.ANTHROPIC_API_KEY
        if not api_key:
            return None

        payload = {
            "model": settings.ANTHROPIC_MODEL,
            "max_tokens": 300,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        }

        headers = {
            "x-api-key": api_key,
            "anthropic-version": self.ANTHROPIC_VERSION,
            "content-type": "application/json",
        }

        try:
            response = requests.post(
                self.ANTHROPIC_URL,
                json=payload,
                headers=headers,
                timeout=settings.LLM_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
        except requests.RequestException:
            return None

        data = response.json()
        blocks = data.get("content") or []
        text = "".join(
            block.get("text", "") for block in blocks if block.get("type") == "text"
        ).strip()

        return text or None

    def _call_openai_compatible(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        api_key: str | None,
        model: str,
        base_url: str,
    ) -> str | None:
        if not api_key:
            return None

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
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
            return None

        data = response.json()
        choices = data.get("choices") or []
        if not choices:
            return None

        message = choices[0].get("message") or {}
        return (message.get("content") or "").strip() or None

    def _build_prompts(
        self,
        *,
        current_location: str | None,
        destination: str,
        driving_route: dict[str, Any] | None,
        transit_route: dict[str, Any] | None,
        weather: dict[str, Any] | None,
        recommended_mode: str,
    ) -> tuple[str, str]:
        system_prompt = (
            "You are LeaveWise, an AI daily commute assistant. "
            "A commute decision has already been made for the user; your job is to explain it in one short, "
            "practical, friendly message. "
            "Do not change or contradict the given recommended_mode. "
            "Do not invent traffic incidents, accidents, or transit delays that are not present in the data. "
            "Keep the answer under 70 words, avoid technical jargon, and write in plain text with no markdown formatting."
        )

        commute_context = {
            "recommended_mode": recommended_mode,
            "current_location": current_location,
            "destination": destination,
            "driving_route": driving_route,
            "transit_route": transit_route,
            "weather": weather,
        }

        user_prompt = (
            "Use the commute data below to write one short recommendation for the user.\n\n"
            f"{json.dumps(commute_context, ensure_ascii=True, indent=2)}\n\n"
            "Rules:\n"
            "- recommended_mode is the final decision; explain it, do not override it.\n"
            "- If recommended_mode is \"driving\", mention driving time from driving_route when available.\n"
            "- If recommended_mode is \"transit\", mention the transit departure/travel time from transit_route when available.\n"
            "- Mention weather impact only if it materially affects the commute.\n"
            "- Keep it concise and practical."
        )

        return system_prompt, user_prompt
