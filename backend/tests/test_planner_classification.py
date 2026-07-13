import pytest

from services.planner import PlannerService


@pytest.fixture
def planner():
    # PlannerService.__init__ just constructs its sub-services (GoogleMapsService(),
    # WeatherService(), LLMService()) — no network calls, no API keys needed, so
    # this is safe to build fresh for every test.
    return PlannerService()


class TestClassifyTraffic:
    def test_missing_drive_minutes_is_unknown(self, planner):
        result = planner._classify_traffic(None, 10)
        assert result["level"] == "unknown"

    def test_missing_static_minutes_is_unknown(self, planner):
        result = planner._classify_traffic(10, None)
        assert result["level"] == "unknown"

    def test_zero_static_minutes_is_unknown(self, planner):
        # static_minutes <= 0 would make delta_ratio a division by zero (or
        # nonsensical), so the code explicitly guards against it.
        result = planner._classify_traffic(10, 0)
        assert result["level"] == "unknown"

    @pytest.mark.parametrize(
        "drive_minutes, static_minutes, expected_level",
        [
            (10, 10, "normal"),  # no delay at all
            (25, 20, "moderate"),  # delta=5 -> hits the delta_minutes >= 5 rule
            (12, 10, "moderate"),  # delta=2 is small, but ratio=0.2 still triggers moderate
            (31, 20, "heavy"),  # delta=11 -> hits the delta_minutes >= 10 rule
            (14, 10, "heavy"),  # delta=4 is small, but ratio=0.4 still triggers heavy
        ],
    )
    def test_thresholds(self, planner, drive_minutes, static_minutes, expected_level):
        result = planner._classify_traffic(drive_minutes, static_minutes)
        assert result["level"] == expected_level


class TestClassifyWeather:
    def test_missing_weather_is_unknown(self, planner):
        result = planner._classify_weather(None)
        assert result["level"] == "unknown"

    @pytest.mark.parametrize(
        "weather, expected_level",
        [
            ({"rain": 3, "precipitation": 0, "wind_speed": 0}, "severe"),
            ({"rain": 0, "precipitation": 5, "wind_speed": 0}, "severe"),
            ({"rain": 0, "precipitation": 0, "wind_speed": 35}, "severe"),
            ({"rain": 0.5, "precipitation": 0, "wind_speed": 0}, "mixed"),
            ({"rain": 0, "precipitation": 0, "wind_speed": 25}, "mixed"),
            ({"rain": 0, "precipitation": 0, "wind_speed": 10}, "good"),
        ],
    )
    def test_thresholds(self, planner, weather, expected_level):
        result = planner._classify_weather(weather)
        assert result["level"] == expected_level


class TestDurationToMinutes:
    def test_none_returns_none(self, planner):
        assert planner._duration_to_minutes(None) is None

    def test_missing_seconds_suffix_returns_none(self, planner):
        assert planner._duration_to_minutes("300") is None

    def test_non_numeric_value_returns_none(self, planner):
        assert planner._duration_to_minutes("abcs") is None

    def test_converts_seconds_to_minutes(self, planner):
        assert planner._duration_to_minutes("300s") == 5

    def test_exact_half_minute_rounds_to_even(self, planner):
        # 150s = 2.5 minutes. Python's round() uses "round half to even"
        # (banker's rounding), not the "always round .5 up" most people expect —
        # round(2.5) is 2, not 3. Worth pinning down explicitly so a future
        # refactor to a "smarter" rounding scheme doesn't silently change behavior.
        assert planner._duration_to_minutes("150s") == 2


class TestModeSelection:
    def test_normal_conditions_choose_shorter_drive_even_if_llm_prefers_transit(self, planner, monkeypatch):
        monkeypatch.setattr(planner.llm, "decide_mode", lambda **kwargs: "transit")
        monkeypatch.setattr(planner.llm, "narrate_recommendation", lambda **kwargs: None)

        decision = planner._build_decision(
            destination="Auckland CBD",
            driving_route={"duration": "3000s", "static_duration": "3000s"},
            transit_route={
                "available": True,
                "status": "Route 11T is running on time.",
                "route_label": "11T",
                "departure_time": "7:30 AM",
                "arrival_time": "8:46 AM",
                "travel_time_minutes": 76,
            },
            weather={"rain": 0, "precipitation": 0, "wind_speed": 8},
            weather_notice=None,
            arrival_time="08:40",
            preference="Fastest route",
        )

        assert decision["recommended_mode"] == "driving"
        assert decision["travel_time_minutes"] == 50

    def test_normal_conditions_choose_shorter_transit_even_if_llm_prefers_driving(self, planner, monkeypatch):
        monkeypatch.setattr(planner.llm, "decide_mode", lambda **kwargs: "driving")
        monkeypatch.setattr(planner.llm, "narrate_recommendation", lambda **kwargs: None)

        decision = planner._build_decision(
            destination="Auckland CBD",
            driving_route={"duration": "3000s", "static_duration": "3000s"},
            transit_route={
                "available": True,
                "status": "NX1 is running on time.",
                "route_label": "NX1",
                "departure_time": "7:35 AM",
                "arrival_time": "8:10 AM",
                "travel_time_minutes": 35,
            },
            weather={"rain": 0, "precipitation": 0, "wind_speed": 8},
            weather_notice=None,
            arrival_time="08:40",
            preference="Fastest route",
        )

        assert decision["recommended_mode"] == "transit"
        assert decision["travel_time_minutes"] == 35
