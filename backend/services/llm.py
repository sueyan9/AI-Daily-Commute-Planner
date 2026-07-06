from __future__ import annotations

import json
from typing import Any

import requests

from core.config import settings

MODE_TOOL_NAME = "submit_mode"
VALID_MODES = {"driving", "transit"}


class LLMService:
    """Two independently-configurable LLM-backed tasks ("agents"):

    - Decision agent (settings.DECISION_LLM_PROVIDER): picks driving vs. transit
      via a forced tool call, so the mode is schema-constrained rather than
      parsed out of free text.
    - Narration agent (settings.NARRATION_LLM_PROVIDER): explains an
      already-decided mode in one sentence.

    Each can point at a different provider/model — e.g. a cheaper/faster model
    for the structured decision, a different one for prose — without touching
    the other. Both fall back to None on any failure; callers fall back to
    their own rule-based logic in that case.
    """

    OPENAI_URL = "https://api.openai.com/v1/chat/completions"
    DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
    ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
    ANTHROPIC_VERSION = "2023-06-01"

    def decide_mode(
        self,
        *,
        destination: str,
        driving_route: dict[str, Any] | None,
        transit_route: dict[str, Any] | None,
        weather: dict[str, Any] | None,
        traffic: dict[str, Any],
        weather_summary: dict[str, Any],
        preference: str | None,
    ) -> str | None:
        if not settings.LLM_ENABLED:
            return None

        system_prompt, user_prompt = self._build_decision_prompts(
            destination=destination,
            driving_route=driving_route,
            transit_route=transit_route,
            weather=weather,
            traffic=traffic,
            weather_summary=weather_summary,
            preference=preference,
        )

        provider = settings.DECISION_LLM_PROVIDER

        if provider == "anthropic":
            mode = self._call_anthropic_tool(system_prompt, user_prompt)
        elif provider == "deepseek":
            mode = self._call_openai_compatible_tool(
                system_prompt,
                user_prompt,
                api_key=settings.DEEPSEEK_API_KEY,
                model=settings.DEEPSEEK_MODEL,
                base_url=self.DEEPSEEK_URL,
            )
        else:
            mode = self._call_openai_compatible_tool(
                system_prompt,
                user_prompt,
                api_key=settings.OPENAI_API_KEY,
                model=settings.OPENAI_MODEL,
                base_url=self.OPENAI_URL,
            )

        return mode

    def narrate_recommendation(
        self,
        *,
        current_location: str | None,
        destination: str,
        driving_route: dict[str, Any] | None,
        transit_route: dict[str, Any] | None,
        weather: dict[str, Any] | None,
        recommended_mode: str,
    ) -> str | None:
        if not settings.LLM_ENABLED:
            return None

        system_prompt, user_prompt = self._build_narration_prompts(
            current_location=current_location,
            destination=destination,
            driving_route=driving_route,
            transit_route=transit_route,
            weather=weather,
            recommended_mode=recommended_mode,
        )

        provider = settings.NARRATION_LLM_PROVIDER

        if provider == "anthropic":
            return self._call_anthropic_text(system_prompt, user_prompt)
        elif provider == "deepseek":
            return self._call_openai_compatible_text(
                system_prompt,
                user_prompt,
                api_key=settings.DEEPSEEK_API_KEY,
                model=settings.DEEPSEEK_MODEL,
                base_url=self.DEEPSEEK_URL,
            )
        else:
            return self._call_openai_compatible_text(
                system_prompt,
                user_prompt,
                api_key=settings.OPENAI_API_KEY,
                model=settings.OPENAI_MODEL,
                base_url=self.OPENAI_URL,
            )

    # --- Decision agent: forced tool call -----------------------------------

    def _call_anthropic_tool(self, system_prompt: str, user_prompt: str) -> str | None:
        api_key = settings.ANTHROPIC_API_KEY
        if not api_key:
            return None

        payload = {
            "model": settings.ANTHROPIC_MODEL,
            "max_tokens": 200,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
            "tools": [self._anthropic_tool_schema()],
            "tool_choice": {"type": "tool", "name": MODE_TOOL_NAME},
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
        for block in data.get("content") or []:
            if block.get("type") == "tool_use" and block.get("name") == MODE_TOOL_NAME:
                return self._parse_mode(block.get("input") or {})

        return None

    def _call_openai_compatible_tool(
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
            "tools": [self._openai_tool_schema()],
            "tool_choice": {"type": "function", "function": {"name": MODE_TOOL_NAME}},
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
        for call in message.get("tool_calls") or []:
            function = call.get("function") or {}
            if function.get("name") != MODE_TOOL_NAME:
                continue

            try:
                arguments = json.loads(function.get("arguments") or "{}")
            except ValueError:
                return None

            return self._parse_mode(arguments)

        return None

    def _parse_mode(self, tool_input: dict[str, Any]) -> str | None:
        mode = tool_input.get("recommended_mode")
        return mode if mode in VALID_MODES else None

    def _anthropic_tool_schema(self) -> dict[str, Any]:
        return {
            "name": MODE_TOOL_NAME,
            "description": "Submit the final commute mode decision.",
            "input_schema": self._tool_parameters_schema(),
        }

    def _openai_tool_schema(self) -> dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": MODE_TOOL_NAME,
                "description": "Submit the final commute mode decision.",
                "parameters": self._tool_parameters_schema(),
            },
        }

    def _tool_parameters_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "recommended_mode": {
                    "type": "string",
                    "enum": ["driving", "transit"],
                    "description": "Which mode to recommend for this commute.",
                },
            },
            "required": ["recommended_mode"],
        }

    def _build_decision_prompts(
        self,
        *,
        destination: str,
        driving_route: dict[str, Any] | None,
        transit_route: dict[str, Any] | None,
        weather: dict[str, Any] | None,
        traffic: dict[str, Any],
        weather_summary: dict[str, Any],
        preference: str | None,
    ) -> tuple[str, str]:
        system_prompt = (
            "You are the decision agent in LeaveWise, an AI daily commute assistant. "
            "Decide whether the user should drive or take public transport today, using only the data provided, "
            "then call the submit_mode tool with your decision. "
            "If transit_route is not available, you must recommend driving. "
            "Prefer the option that best matches the user's stated preference when one is given."
        )

        commute_context = {
            "destination": destination,
            "driving_route": driving_route,
            "transit_route": transit_route,
            "weather": weather,
            "traffic_assessment": {"level": traffic.get("level"), "message": traffic.get("message")},
            "weather_assessment": {"level": weather_summary.get("level"), "message": weather_summary.get("message")},
            "user_preference": preference,
        }

        user_prompt = (
            "Decide the best commute mode using the data below, then call submit_mode.\n\n"
            f"{json.dumps(commute_context, ensure_ascii=True, indent=2)}"
        )

        return system_prompt, user_prompt

    # --- Narration agent: free text ------------------------------------------

    def _call_anthropic_text(self, system_prompt: str, user_prompt: str) -> str | None:
        api_key = settings.ANTHROPIC_API_KEY
        if not api_key:
            return None

        payload = {
            "model": settings.ANTHROPIC_MODEL,
            "max_tokens": 200,
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
        text = "".join(
            block.get("text", "") for block in data.get("content") or [] if block.get("type") == "text"
        ).strip()

        return text or None

    def _call_openai_compatible_text(
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

    def _build_narration_prompts(
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
            "You are the narration agent in LeaveWise, an AI daily commute assistant. "
            "A separate decision agent has already picked recommended_mode; your only job is to explain it in a "
            "single, punchy sentence, like a weather-app headline, not a paragraph. "
            "Do not change or contradict the given recommended_mode. "
            "Do not invent traffic incidents, accidents, or transit delays that are not present in the data. "
            "Respond with exactly one short sentence, at most 20 words, no greeting, no sign-off, "
            "avoid technical jargon, and write in plain text with no markdown formatting."
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
            "- One sentence only, at most 20 words."
        )

        return system_prompt, user_prompt
