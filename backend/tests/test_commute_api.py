import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def build_mock_commute_plan() -> dict:
    return {
        "current_location": "23 Saint Catherine Crescent, West Harbour, Auckland 0618, New Zealand",
        "destination": "Auckland CBD, Auckland, New Zealand",
        "driving_route": {
            "duration": "1250s",
            "distance_meters": 19052,
            "static_duration": "1080s",
        },
        "transit_route": {
            "available": True,
            "status": "NX1 is running on time.",
            "route_label": "NX1",
            "departure_time": "8:05 AM",
            "arrival_time": "8:42 AM",
            "travel_time_minutes": 37,
            "next_departures": ["8:05 AM", "8:15 AM"],
        },
        "weather": {
            "temperature": 12.5,
            "feels_like": 10.8,
            "precipitation": 0,
            "rain": 0,
            "weather_code": 3,
            "wind_speed": 15.2,
        },
        "weather_notice": None,
        "recommendation": "Leave now by car. Driving is estimated to take about 21 minutes and conditions look fine.",
        "decision": {
            "recommended_mode": "driving",
            "recommended_label": "Drive",
            "recommended_icon": "🚗",
            "leave_time": "8:04 AM",
            "arrival_time": "8:25 AM",
            "travel_time_minutes": 21,
            "traffic": {
                "level": "moderate",
                "importance": "medium",
                "message": "Traffic is a little slower than usual, adding about 3 minutes.",
                "tag": "Moderate traffic",
            },
            "headline": "Driving looks manageable today.",
            "reason": "Leave now by car. Driving is estimated to take about 21 minutes and conditions look fine.",
            "summary": "Leave now by car. Driving is estimated to take about 21 minutes and conditions look fine.",
            "decision_factors": [
                {
                    "type": "traffic",
                    "importance": "medium",
                    "message": "Traffic is a little slower than usual, adding about 3 minutes.",
                },
                {
                    "type": "weather",
                    "importance": "medium",
                    "message": "Weather conditions look favourable for the trip.",
                },
                {
                    "type": "transit",
                    "importance": "medium",
                    "message": "NX1 is running on time.",
                },
            ],
            "highlights": [
                {"icon": "🚗", "label": "21 min"},
                {"icon": "🚦", "label": "Moderate traffic"},
                {"icon": "🌤", "label": "Good weather"},
            ],
            "comparison": {
                "title": "Today's Comparison",
                "recommended_mode": "driving",
                "driving": {
                    "label": "Drive",
                    "leave_time": "8:04 AM",
                    "arrival_time": "8:25 AM",
                    "travel_time_minutes": 21,
                },
                "transit": {
                    "label": "Public transport",
                    "available": True,
                    "status": "NX1 is running on time.",
                    "route_label": "NX1",
                    "departure_time": "8:05 AM",
                    "arrival_time": "8:42 AM",
                    "travel_time_minutes": 37,
                    "next_departures": ["8:05 AM", "8:15 AM"],
                },
            },
            "destination": "Auckland CBD, Auckland, New Zealand",
        },
        "routing_basis": "live",
    }


def build_valid_request() -> dict:
    return {
        "latitude": -36.82,
        "longitude": 174.61,
        "destination": "Auckland CBD, Auckland, New Zealand",
        "arrival_time": "08:25",
        "preference": "fastest route",
    }


def _patch_planner(monkeypatch, replacement):
    monkeypatch.setattr("api.commute.planner.create_commute_plan", replacement)


def test_valid_request_returns_http_200(monkeypatch, client):
    def fake_create_commute_plan(**kwargs):
        return build_mock_commute_plan()

    _patch_planner(monkeypatch, fake_create_commute_plan)

    response = client.post("/commute/plan", json=build_valid_request())

    assert response.status_code == 200


def test_valid_request_returns_expected_top_level_fields(monkeypatch, client):
    def fake_create_commute_plan(**kwargs):
        return build_mock_commute_plan()

    _patch_planner(monkeypatch, fake_create_commute_plan)

    response = client.post("/commute/plan", json=build_valid_request())

    body = response.json()

    assert set(body) == {
        "current_location",
        "destination",
        "driving_route",
        "transit_route",
        "weather",
        "weather_notice",
        "recommendation",
        "decision",
        "routing_basis",
    }
    assert body["driving_route"] == {
        "duration": "1250s",
        "distance_meters": 19052,
        "static_duration": "1080s",
    }
    assert body["weather"] == {
        "temperature": 12.5,
        "feels_like": 10.8,
        "precipitation": 0,
        "rain": 0,
        "weather_code": 3,
        "wind_speed": 15.2,
    }
    assert body["decision"]["comparison"]["transit"]["next_departures"] == ["8:05 AM", "8:15 AM"]


def test_recommendation_values_come_from_controlled_mock(monkeypatch, client):
    def fake_create_commute_plan(**kwargs):
        assert kwargs == {
            "latitude": -36.82,
            "longitude": 174.61,
            "destination": "Auckland CBD, Auckland, New Zealand",
            "arrival_time": "08:25",
            "preference": "fastest route",
        }
        return build_mock_commute_plan()

    _patch_planner(monkeypatch, fake_create_commute_plan)

    response = client.post("/commute/plan", json=build_valid_request())

    body = response.json()

    assert body["recommendation"] == (
        "Leave now by car. Driving is estimated to take about 21 minutes and conditions look fine."
    )
    assert body["decision"]["recommended_mode"] == "driving"
    assert body["decision"]["travel_time_minutes"] == 21


def test_missing_destination_returns_422(monkeypatch, client):
    def fake_create_commute_plan(**kwargs):
        raise AssertionError("Planner should not be called for invalid requests")

    _patch_planner(monkeypatch, fake_create_commute_plan)

    response = client.post(
        "/commute/plan",
        json={
            "latitude": -36.82,
            "longitude": 174.61,
        },
    )

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "destination"]
    assert response.json()["detail"][0]["type"] == "missing"


def test_planner_failure_returns_500(monkeypatch):
    def fake_create_commute_plan(**kwargs):
        raise RuntimeError("planner failed")

    _patch_planner(monkeypatch, fake_create_commute_plan)

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.post("/commute/plan", json=build_valid_request())

    assert response.status_code == 500
    assert response.text == "Internal Server Error"
