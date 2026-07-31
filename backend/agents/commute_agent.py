from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

import requests

from core.config import settings
from services.google_maps import GoogleMapsService
from services.weather import WeatherService
from tools.route_tool import (
    DRIVING_ROUTE_TOOL,
    TRANSIT_ROUTE_TOOL,
    run_driving_route,
    run_transit_route,
)
from tools.weather_tool import WEATHER_TOOL, run_weather

TIMEZONE = ZoneInfo("Pacific/Auckland")

SUBMIT_TOOL_NAME = "submit_recommendation"
VALID_MODES = {"driving", "transit"}

SUBMIT_TOOL = {
    "name": SUBMIT_TOOL_NAME,
    "description": "Submit the final commute recommendation once enough data has been gathered.",
    "parameters": {
        "type": "object",
        "properties": {
            "recommended_mode": {
                "type": "string",
                "enum": ["driving", "transit"],
                "description": "Which mode to recommend for this commute.",
            },
            "reasoning": {
                "type": "string",
                "description": "One short sentence explaining the decision.",
            },
        },
        "required": ["recommended_mode"],
    },
}

DATA_TOOLS = [DRIVING_ROUTE_TOOL, TRANSIT_ROUTE_TOOL, WEATHER_TOOL]


@dataclass
class AgentRunResult:
    recommended_mode: str
    reasoning: str | None
    driving_route: dict[str, Any] | None
    transit_route: dict[str, Any] | None
    weather: dict[str, Any] | None
    routing_basis: str  # "live" or "predicted"
    turns: int
    trace: list[dict[str, Any]]


@dataclass
class _Session:
    """Per-request tool context and everything the agent has collected so far,
    so the planner can reuse the data without re-fetching."""

    origin_address: str
    origin_latitude: float
    origin_longitude: float
    destination: str
    destination_latitude: float
    destination_longitude: float
    driving_route: dict[str, Any] | None = None
    transit_route: dict[str, Any] | None = None
    weather: dict[str, Any] | None = None
    predicted: bool = False
    trace: list[dict[str, Any]] = field(default_factory=list)


class CommuteAgent:
    """Bounded tool-calling agent loop for the commute decision.

    The model is given three context-bound data tools (driving route, transit
    route, weather) and decides for itself what to fetch, in what order, and for
    which departure window, then must finish via the submit_recommendation tool
    so the outcome stays schema-constrained. The loop is capped at
    settings.AGENT_MAX_TURNS; on the final turn the submit tool is forced.
    Any transport failure returns None and the caller falls back to the
    deterministic pipeline in PlannerService.
    """

    OPENAI_URL = "https://api.openai.com/v1/chat/completions"
    DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
    ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
    ANTHROPIC_VERSION = "2023-06-01"

    def __init__(
        self,
        google_maps: GoogleMapsService | None = None,
        weather: WeatherService | None = None,
    ) -> None:
        self.google_maps = google_maps or GoogleMapsService()
        self.weather = weather or WeatherService()

    def run(
        self,
        *,
        origin_address: str,
        origin_latitude: float,
        origin_longitude: float,
        destination: str,
        destination_latitude: float,
        destination_longitude: float,
        arrival_time: str | None = None,
        preference: str | None = None,
    ) -> AgentRunResult | None:
        if not settings.LLM_ENABLED or not settings.AGENT_ENABLED:
            return None

        session = _Session(
            origin_address=origin_address,
            origin_latitude=origin_latitude,
            origin_longitude=origin_longitude,
            destination=destination,
            destination_latitude=destination_latitude,
            destination_longitude=destination_longitude,
        )
        system_prompt, user_prompt = self._build_prompts(
            session, arrival_time=arrival_time, preference=preference
        )

        try:
            if settings.AGENT_LLM_PROVIDER == "anthropic":
                return self._run_anthropic(session, system_prompt, user_prompt)
            return self._run_openai_compatible(session, system_prompt, user_prompt)
        except requests.RequestException:
            return None

    # --- Agent loop: Anthropic messages format -------------------------------

    def _run_anthropic(
        self, session: _Session, system_prompt: str, user_prompt: str
    ) -> AgentRunResult | None:
        api_key = settings.ANTHROPIC_API_KEY
        if not api_key:
            return None

        headers = {
            "x-api-key": api_key,
            "anthropic-version": self.ANTHROPIC_VERSION,
            "content-type": "application/json",
        }
        tools = [
            {
                "name": tool["name"],
                "description": tool["description"],
                "input_schema": tool["parameters"],
            }
            for tool in DATA_TOOLS + [SUBMIT_TOOL]
        ]
        messages: list[dict[str, Any]] = [{"role": "user", "content": user_prompt}]

        for turn in range(1, settings.AGENT_MAX_TURNS + 1):
            payload: dict[str, Any] = {
                "model": settings.ANTHROPIC_MODEL,
                "max_tokens": 700,
                "system": system_prompt,
                "messages": messages,
                "tools": tools,
            }
            if turn == settings.AGENT_MAX_TURNS:
                payload["tool_choice"] = {"type": "tool", "name": SUBMIT_TOOL_NAME}

            data = self._post_json(self.ANTHROPIC_URL, payload, headers)
            content = data.get("content") or []
            tool_uses = [block for block in content if block.get("type") == "tool_use"]

            for block in tool_uses:
                if block.get("name") == SUBMIT_TOOL_NAME:
                    return self._finish(session, block.get("input") or {}, turns=turn)

            messages.append({"role": "assistant", "content": content})

            if not tool_uses:
                messages.append(
                    {
                        "role": "user",
                        "content": (
                            "Use the tools to gather data, then call "
                            f"{SUBMIT_TOOL_NAME} with your decision."
                        ),
                    }
                )
                continue

            results = [
                {
                    "type": "tool_result",
                    "tool_use_id": block["id"],
                    "content": json.dumps(
                        self._execute_tool(session, block.get("name"), block.get("input") or {})
                    ),
                }
                for block in tool_uses
            ]
            messages.append({"role": "user", "content": results})

        return None

    # --- Agent loop: OpenAI-compatible format --------------------------------

    def _run_openai_compatible(
        self, session: _Session, system_prompt: str, user_prompt: str
    ) -> AgentRunResult | None:
        if settings.AGENT_LLM_PROVIDER == "deepseek":
            api_key, model, base_url = (
                settings.DEEPSEEK_API_KEY,
                settings.DEEPSEEK_MODEL,
                self.DEEPSEEK_URL,
            )
        else:
            api_key, model, base_url = (
                settings.OPENAI_API_KEY,
                settings.OPENAI_MODEL,
                self.OPENAI_URL,
            )

        if not api_key:
            return None

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        tools = [
            {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool["description"],
                    "parameters": tool["parameters"],
                },
            }
            for tool in DATA_TOOLS + [SUBMIT_TOOL]
        ]
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        for turn in range(1, settings.AGENT_MAX_TURNS + 1):
            payload: dict[str, Any] = {
                "model": model,
                "messages": messages,
                "tools": tools,
            }
            if turn == settings.AGENT_MAX_TURNS:
                payload["tool_choice"] = {
                    "type": "function",
                    "function": {"name": SUBMIT_TOOL_NAME},
                }

            data = self._post_json(base_url, payload, headers)
            choices = data.get("choices") or []
            if not choices:
                return None

            message = choices[0].get("message") or {}
            tool_calls = message.get("tool_calls") or []

            for call in tool_calls:
                function = call.get("function") or {}
                if function.get("name") == SUBMIT_TOOL_NAME:
                    try:
                        arguments = json.loads(function.get("arguments") or "{}")
                    except ValueError:
                        return None
                    return self._finish(session, arguments, turns=turn)

            messages.append(message)

            if not tool_calls:
                messages.append(
                    {
                        "role": "user",
                        "content": (
                            "Use the tools to gather data, then call "
                            f"{SUBMIT_TOOL_NAME} with your decision."
                        ),
                    }
                )
                continue

            for call in tool_calls:
                function = call.get("function") or {}
                try:
                    arguments = json.loads(function.get("arguments") or "{}")
                except ValueError:
                    arguments = {}
                result = self._execute_tool(session, function.get("name"), arguments)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.get("id"),
                        "content": json.dumps(result),
                    }
                )

        return None

    # --- Tool dispatch --------------------------------------------------------

    def _execute_tool(
        self, session: _Session, name: str | None, arguments: dict[str, Any]
    ) -> dict[str, Any]:
        try:
            if name == "get_driving_route":
                result = run_driving_route(
                    self.google_maps,
                    origin=session.origin_address,
                    destination=session.destination,
                    arguments=arguments,
                )
                if "error" not in result:
                    session.driving_route = result
                    if arguments.get("departure_time"):
                        session.predicted = True
            elif name == "get_transit_route":
                result = run_transit_route(
                    self.google_maps,
                    origin_latitude=session.origin_latitude,
                    origin_longitude=session.origin_longitude,
                    destination_latitude=session.destination_latitude,
                    destination_longitude=session.destination_longitude,
                    arguments=arguments,
                )
                session.transit_route = result
                if result.get("available") and arguments.get("departure_time"):
                    session.predicted = True
            elif name == "get_current_weather":
                result = run_weather(
                    self.weather,
                    latitude=session.origin_latitude,
                    longitude=session.origin_longitude,
                )
                if "error" not in result:
                    session.weather = result
            else:
                result = {"error": f"Unknown tool: {name}"}
        except requests.RequestException:
            result = {"error": "The data source is temporarily unavailable."}

        session.trace.append(
            {
                "tool": name,
                "input": arguments,
                "status": "error" if "error" in result else "ok",
            }
        )
        return result

    def _finish(
        self, session: _Session, arguments: dict[str, Any], *, turns: int
    ) -> AgentRunResult | None:
        mode = arguments.get("recommended_mode")
        if mode not in VALID_MODES:
            return None

        return AgentRunResult(
            recommended_mode=mode,
            reasoning=arguments.get("reasoning"),
            driving_route=session.driving_route,
            transit_route=session.transit_route,
            weather=session.weather,
            routing_basis="predicted" if session.predicted else "live",
            turns=turns,
            trace=session.trace,
        )

    # --- Prompts and transport ------------------------------------------------

    def _build_prompts(
        self,
        session: _Session,
        *,
        arrival_time: str | None,
        preference: str | None,
    ) -> tuple[str, str]:
        system_prompt = (
            "You are the planning agent in LeaveWise, an AI daily commute assistant. "
            "Decide whether the user should drive or take public transport today. "
            "Gather live data with the tools before deciding: at minimum the driving route "
            "and current weather, plus the transit route whenever it could be viable. "
            "If the transit tool reports no available route, you must recommend driving. "
            "If a target arrival time is given, pass a suitable departure_time to the route "
            "tools so the estimates reflect that window, and prefer the option less likely "
            "to arrive late, even if it contradicts the stated preference. "
            "Base your decision only on tool results; do not invent traffic incidents or "
            f"transit delays. When you have enough data, call {SUBMIT_TOOL_NAME}."
        )

        request_context = {
            "current_time": datetime.now(TIMEZONE).strftime("%H:%M"),
            "current_location": session.origin_address,
            "destination": session.destination,
            "target_arrival_time": arrival_time,
            "user_preference": preference,
        }

        user_prompt = (
            "Plan today's commute using the request below. Gather the data you need with "
            f"the tools, then call {SUBMIT_TOOL_NAME}.\n\n"
            f"{json.dumps(request_context, ensure_ascii=True, indent=2)}"
        )

        return system_prompt, user_prompt

    def _post_json(
        self, url: str, payload: dict[str, Any], headers: dict[str, str]
    ) -> dict[str, Any]:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=settings.LLM_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return response.json()
