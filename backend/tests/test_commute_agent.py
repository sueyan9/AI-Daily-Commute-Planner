import pytest
import requests

from agents.commute_agent import AgentRunResult, CommuteAgent
from core.config import settings
from services.planner import PlannerService


class FakeGoogleMaps:
    def get_driving_route(self, origin, destination, departure_time=None):
        return {"duration": "1200s", "static_duration": "1100s", "distance_meters": 15000}

    def get_transit_route(self, **kwargs):
        return {
            "available": True,
            "status": "No transfers needed.",
            "route_label": "NX1",
            "departure_time": "8:05 AM",
            "arrival_time": "8:42 AM",
            "travel_time_minutes": 37,
            "transfers": 0,
            "next_departures": [],
        }


class FakeWeather:
    def get_current_weather(self, latitude, longitude):
        return {
            "temperature": 15.0,
            "feels_like": 14.0,
            "precipitation": 0,
            "rain": 0,
            "weather_code": 1,
            "wind_speed": 10.0,
        }


@pytest.fixture
def agent(monkeypatch):
    monkeypatch.setattr(settings, "LLM_ENABLED", True)
    monkeypatch.setattr(settings, "AGENT_ENABLED", True)
    monkeypatch.setattr(settings, "AGENT_LLM_PROVIDER", "anthropic")
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setattr(settings, "AGENT_MAX_TURNS", 5)
    return CommuteAgent(google_maps=FakeGoogleMaps(), weather=FakeWeather())


def run_agent(agent):
    return agent.run(
        origin_address="1 Example St, Auckland",
        origin_latitude=-36.82,
        origin_longitude=174.61,
        destination="Auckland CBD",
        destination_latitude=-36.85,
        destination_longitude=174.76,
        arrival_time="09:00",
        preference=None,
    )


def canned_transport(monkeypatch, agent, responses):
    """Replace the HTTP transport with a canned response sequence and capture
    each outgoing payload for assertions."""
    payloads = []

    def fake_post_json(url, payload, headers):
        payloads.append(payload)
        return responses.pop(0)

    monkeypatch.setattr(agent, "_post_json", fake_post_json)
    return payloads


def anthropic_tool_use(name, arguments, block_id="t1"):
    return {"content": [{"type": "tool_use", "id": block_id, "name": name, "input": arguments}]}


class TestAnthropicLoop:
    def test_gathers_data_then_submits(self, agent, monkeypatch):
        canned_transport(
            monkeypatch,
            agent,
            [
                {
                    "content": [
                        {"type": "tool_use", "id": "t1", "name": "get_driving_route", "input": {}},
                        {"type": "tool_use", "id": "t2", "name": "get_current_weather", "input": {}},
                    ]
                },
                anthropic_tool_use(
                    "submit_recommendation",
                    {"recommended_mode": "driving", "reasoning": "Fastest option."},
                    block_id="t3",
                ),
            ],
        )

        result = run_agent(agent)

        assert result is not None
        assert result.recommended_mode == "driving"
        assert result.reasoning == "Fastest option."
        assert result.driving_route == {
            "duration": "1200s",
            "static_duration": "1100s",
            "distance_meters": 15000,
        }
        assert result.weather["temperature"] == 15.0
        assert result.transit_route is None
        assert result.routing_basis == "live"
        assert result.turns == 2
        assert [entry["tool"] for entry in result.trace] == [
            "get_driving_route",
            "get_current_weather",
        ]

    def test_departure_time_marks_routing_as_predicted(self, agent, monkeypatch):
        canned_transport(
            monkeypatch,
            agent,
            [
                anthropic_tool_use("get_driving_route", {"departure_time": "08:30"}),
                anthropic_tool_use(
                    "submit_recommendation", {"recommended_mode": "driving"}, block_id="t2"
                ),
            ],
        )

        result = run_agent(agent)

        assert result.routing_basis == "predicted"

    def test_final_turn_forces_submit_tool(self, agent, monkeypatch):
        monkeypatch.setattr(settings, "AGENT_MAX_TURNS", 2)
        payloads = canned_transport(
            monkeypatch,
            agent,
            [
                {"content": [{"type": "text", "text": "Let me think about this."}]},
                anthropic_tool_use("submit_recommendation", {"recommended_mode": "transit"}),
            ],
        )

        result = run_agent(agent)

        assert result is not None
        assert result.recommended_mode == "transit"
        assert "tool_choice" not in payloads[0]
        assert payloads[1]["tool_choice"] == {"type": "tool", "name": "submit_recommendation"}

    def test_invalid_mode_returns_none(self, agent, monkeypatch):
        canned_transport(
            monkeypatch,
            agent,
            [anthropic_tool_use("submit_recommendation", {"recommended_mode": "teleport"})],
        )

        assert run_agent(agent) is None

    def test_transport_failure_returns_none(self, agent, monkeypatch):
        def failing_post_json(url, payload, headers):
            raise requests.ConnectionError("boom")

        monkeypatch.setattr(agent, "_post_json", failing_post_json)

        assert run_agent(agent) is None

    def test_disabled_agent_returns_none(self, agent, monkeypatch):
        monkeypatch.setattr(settings, "AGENT_ENABLED", False)

        assert run_agent(agent) is None


class TestOpenAICompatibleLoop:
    @pytest.fixture
    def agent(self, agent, monkeypatch):
        monkeypatch.setattr(settings, "AGENT_LLM_PROVIDER", "openai")
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
        return agent

    def test_gathers_data_then_submits(self, agent, monkeypatch):
        canned_transport(
            monkeypatch,
            agent,
            [
                {
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "tool_calls": [
                                    {
                                        "id": "c1",
                                        "function": {
                                            "name": "get_transit_route",
                                            "arguments": "{}",
                                        },
                                    }
                                ],
                            }
                        }
                    ]
                },
                {
                    "choices": [
                        {
                            "message": {
                                "role": "assistant",
                                "tool_calls": [
                                    {
                                        "id": "c2",
                                        "function": {
                                            "name": "submit_recommendation",
                                            "arguments": '{"recommended_mode": "transit"}',
                                        },
                                    }
                                ],
                            }
                        }
                    ]
                },
            ],
        )

        result = run_agent(agent)

        assert result is not None
        assert result.recommended_mode == "transit"
        assert result.transit_route["available"] is True
        assert result.turns == 2


def agent_run_result(**overrides):
    defaults = dict(
        recommended_mode="transit",
        reasoning="Bus beats the motorway this morning.",
        driving_route={"duration": "3000s", "static_duration": "1500s", "distance_meters": 19000},
        transit_route={
            "available": True,
            "status": "No transfers needed.",
            "route_label": "NX1",
            "departure_time": "8:05 AM",
            "arrival_time": "8:42 AM",
            "travel_time_minutes": 37,
            "next_departures": [],
        },
        weather={"rain": 0, "precipitation": 0, "wind_speed": 10},
        routing_basis="predicted",
        turns=3,
        trace=[{"tool": "get_driving_route", "input": {}, "status": "ok"}],
    )
    defaults.update(overrides)
    return AgentRunResult(**defaults)


class TestPlannerIntegration:
    @pytest.fixture
    def planner(self, monkeypatch):
        planner = PlannerService()
        monkeypatch.setattr(planner.google_maps, "reverse_geocode", lambda lat, lon: "1 Example St")
        monkeypatch.setattr(
            planner.google_maps,
            "geocode_address",
            lambda address: {"latitude": -36.85, "longitude": 174.76, "formatted_address": address},
        )
        monkeypatch.setattr(planner.llm, "narrate_recommendation", lambda **kwargs: None)
        return planner

    def test_agent_result_is_used_without_refetching(self, planner, monkeypatch):
        result = agent_run_result()
        monkeypatch.setattr(planner.agent, "run", lambda **kwargs: result)

        def fail(*args, **kwargs):
            raise AssertionError("should not re-fetch data the agent collected")

        monkeypatch.setattr(planner.google_maps, "get_driving_route", fail)
        monkeypatch.setattr(planner.google_maps, "get_transit_route", fail)
        monkeypatch.setattr(planner.weather, "get_current_weather", fail)
        monkeypatch.setattr(planner.llm, "decide_mode", fail)

        plan = planner.create_commute_plan(
            latitude=-36.82,
            longitude=174.61,
            destination="Auckland CBD",
            arrival_time="09:00",
        )

        # Heavy traffic (3000s vs 1500s static) means the normal-conditions
        # guardrail does not apply, so the agent's transit call stands.
        assert plan["decision"]["recommended_mode"] == "transit"
        assert plan["driving_route"] == result.driving_route
        assert plan["transit_route"] == result.transit_route
        assert plan["routing_basis"] == "predicted"
        assert plan["agent"]["used"] is True
        assert plan["agent"]["turns"] == 3
        assert plan["agent"]["reasoning"] == "Bus beats the motorway this morning."

    def test_agent_failure_falls_back_to_pipeline(self, planner, monkeypatch):
        monkeypatch.setattr(planner.agent, "run", lambda **kwargs: None)
        monkeypatch.setattr(
            planner.google_maps,
            "get_driving_route",
            lambda **kwargs: {"duration": "1200s", "static_duration": "1150s", "distance_meters": 15000},
        )
        monkeypatch.setattr(
            planner.google_maps,
            "get_transit_route",
            lambda **kwargs: {"available": False, "status": "No route found."},
        )
        monkeypatch.setattr(
            planner.weather,
            "get_current_weather",
            lambda lat, lon: {"rain": 0, "precipitation": 0, "wind_speed": 8},
        )
        monkeypatch.setattr(planner.llm, "decide_mode", lambda **kwargs: None)

        plan = planner.create_commute_plan(
            latitude=-36.82,
            longitude=174.61,
            destination="Auckland CBD",
        )

        assert plan["decision"]["recommended_mode"] == "driving"
        assert plan["agent"]["used"] is False
        assert plan["agent"]["trace"] == []

    def test_agent_transit_pick_is_overridden_when_transit_unavailable(self, planner, monkeypatch):
        result = agent_run_result(
            transit_route={"available": False, "status": "No route found."},
            driving_route={"duration": "1200s", "static_duration": "1150s", "distance_meters": 15000},
        )
        monkeypatch.setattr(planner.agent, "run", lambda **kwargs: result)
        monkeypatch.setattr(planner.weather, "get_current_weather", lambda lat, lon: result.weather)
        monkeypatch.setattr(planner.llm, "decide_mode", lambda **kwargs: None)

        plan = planner.create_commute_plan(
            latitude=-36.82,
            longitude=174.61,
            destination="Auckland CBD",
        )

        assert plan["decision"]["recommended_mode"] == "driving"
