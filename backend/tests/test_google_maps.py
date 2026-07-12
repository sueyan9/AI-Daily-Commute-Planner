from datetime import datetime
from zoneinfo import ZoneInfo

import pytest

from services.google_maps import GoogleMapsService


class FakeResponse:
    """Stands in for requests.Response — just enough of its interface
    (.json() and .raise_for_status()) for our code to work with."""

    def __init__(self, json_data, status_code=200):
        self._json_data = json_data
        self.status_code = status_code

    def json(self):
        return self._json_data

    def raise_for_status(self):
        if self.status_code >= 400:
            raise Exception(f"HTTP {self.status_code}")


@pytest.fixture
def maps_service():
    return GoogleMapsService()


class TestGetDrivingRoute:
    def test_returns_parsed_route(self, monkeypatch, maps_service):
        def fake_post(url, json=None, headers=None, timeout=None):
            return FakeResponse(
                {
                    "routes": [
                        {
                            "duration": "300s",
                            "distanceMeters": 2000,
                            "staticDuration": "250s",
                        }
                    ]
                }
            )

        # We patch "services.google_maps.requests.post" — i.e. requests.post
        # as looked up from *inside* the google_maps module — not
        # "requests.post" globally. This is the single most common mistake
        # with mocking: patch where a name is *used*, not where it's defined.
        monkeypatch.setattr("services.google_maps.requests.post", fake_post)

        result = maps_service.get_driving_route(origin="A", destination="B")

        assert result == {
            "duration": "300s",
            "distance_meters": 2000,
            "static_duration": "250s",
        }

    def test_returns_none_when_no_routes(self, monkeypatch, maps_service):
        monkeypatch.setattr(
            "services.google_maps.requests.post",
            lambda *args, **kwargs: FakeResponse({"routes": []}),
        )

        result = maps_service.get_driving_route(origin="A", destination="B")

        assert result is None

    def test_includes_departure_time_in_payload_when_given(self, monkeypatch, maps_service):
        captured_payloads = []

        def fake_post(url, json=None, headers=None, timeout=None):
            captured_payloads.append(json)
            return FakeResponse({"routes": [{"duration": "1s", "distanceMeters": 1}]})

        monkeypatch.setattr("services.google_maps.requests.post", fake_post)

        departure = datetime(2026, 7, 7, 8, 40, tzinfo=ZoneInfo("Pacific/Auckland"))
        maps_service.get_driving_route(origin="A", destination="B", departure_time=departure)

        # Confirms the payload we actually sent contains a correctly
        # UTC-converted departureTime — not just that the function ran
        # without crashing.
        assert captured_payloads[0]["departureTime"] == "2026-07-06T20:40:00Z"

    def test_omits_departure_time_when_not_given(self, monkeypatch, maps_service):
        captured_payloads = []

        def fake_post(url, json=None, headers=None, timeout=None):
            captured_payloads.append(json)
            return FakeResponse({"routes": [{"duration": "1s", "distanceMeters": 1}]})

        monkeypatch.setattr("services.google_maps.requests.post", fake_post)

        maps_service.get_driving_route(origin="A", destination="B")

        assert "departureTime" not in captured_payloads[0]


class TestGeocodeAddress:
    def test_returns_parsed_location(self, monkeypatch, maps_service):
        monkeypatch.setattr(
            "services.google_maps.requests.get",
            lambda *args, **kwargs: FakeResponse(
                {
                    "status": "OK",
                    "results": [
                        {
                            "formatted_address": "1 Queen St, Auckland",
                            "geometry": {"location": {"lat": -36.85, "lng": 174.76}},
                        }
                    ],
                }
            ),
        )

        result = maps_service.geocode_address("1 Queen St")

        assert result == {
            "latitude": -36.85,
            "longitude": 174.76,
            "formatted_address": "1 Queen St, Auckland",
        }

    def test_returns_none_when_status_not_ok(self, monkeypatch, maps_service):
        monkeypatch.setattr(
            "services.google_maps.requests.get",
            lambda *args, **kwargs: FakeResponse({"status": "ZERO_RESULTS", "results": []}),
        )

        result = maps_service.geocode_address("nonsense address")

        assert result is None
