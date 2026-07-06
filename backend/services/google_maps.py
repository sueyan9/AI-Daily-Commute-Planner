from datetime import datetime
from zoneinfo import ZoneInfo

import requests

from core.config import settings


class GoogleMapsService:
    BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
    ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
    TIMEZONE = ZoneInfo("Pacific/Auckland")
    TRANSIT_FIELD_MASK = (
        "routes.duration,"
        "routes.legs.steps.travelMode,"
        "routes.legs.steps.transitDetails.stopDetails.departureTime,"
        "routes.legs.steps.transitDetails.stopDetails.arrivalTime,"
        "routes.legs.steps.transitDetails.stopDetails.departureStop.name,"
        "routes.legs.steps.transitDetails.stopDetails.arrivalStop.name,"
        "routes.legs.steps.transitDetails.transitLine.nameShort,"
        "routes.legs.steps.transitDetails.transitLine.name"
    )

    def geocode_address(self, address: str):
        params = {
            "address": address,
            "key": settings.GOOGLE_MAPS_API_KEY,
        }

        response = requests.get(
            self.BASE_URL,
            params=params,
            timeout=10,
        )
        data = response.json()

        if data["status"] != "OK":
            return None

        location = data["results"][0]["geometry"]["location"]
        return {
            "latitude": location["lat"],
            "longitude": location["lng"],
            "formatted_address": data["results"][0]["formatted_address"],
        }

    def reverse_geocode(self, latitude: float, longitude: float):

        params = {
            "latlng": f"{latitude},{longitude}",
            "key": settings.GOOGLE_MAPS_API_KEY,
        }

        response = requests.get(
            self.BASE_URL,
            params=params,
            timeout=10,
        )
        data = response.json()

        if data["status"] != "OK":
            return None

        return data["results"][0]["formatted_address"]

    def get_driving_route(
        self,
        origin: str,
        destination: str,
        departure_time: datetime | None = None,
    ):
        payload = {
            "origin": {
                "address": origin,
            },
            "destination": {
                "address": destination,
            },
            "travelMode": "DRIVE",
            "routingPreference": "TRAFFIC_AWARE",
            "computeAlternativeRoutes": False,
        }

        if departure_time is not None:
            payload["departureTime"] = departure_time.astimezone(ZoneInfo("UTC")).strftime("%Y-%m-%dT%H:%M:%SZ")

        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": settings.GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask": (
                "routes.duration,"
                "routes.staticDuration,"
                "routes.distanceMeters"
            ),
        }

        response = requests.post(
            self.ROUTES_URL,
            json=payload,
            headers=headers,
            timeout=10,
        )

        response.raise_for_status()

        data = response.json()

        if not data.get("routes"):
            return None

        route = data["routes"][0]

        return {
            "duration": route["duration"],
            "distance_meters": route["distanceMeters"],
            "static_duration": route.get("staticDuration"),
        }

    def get_transit_route(
        self,
        *,
        origin_latitude: float,
        origin_longitude: float,
        destination_latitude: float,
        destination_longitude: float,
        departure_time: datetime | None = None,
    ):
        effective_departure = departure_time or datetime.now(ZoneInfo("UTC"))
        payload = {
            "origin": {
                "location": {"latLng": {"latitude": origin_latitude, "longitude": origin_longitude}},
            },
            "destination": {
                "location": {"latLng": {"latitude": destination_latitude, "longitude": destination_longitude}},
            },
            "travelMode": "TRANSIT",
            "departureTime": effective_departure.astimezone(ZoneInfo("UTC")).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "transitPreferences": {"routingPreference": "FEWER_TRANSFERS"},
        }

        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": settings.GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask": self.TRANSIT_FIELD_MASK,
        }

        try:
            response = requests.post(
                self.ROUTES_URL,
                json=payload,
                headers=headers,
                timeout=10,
            )
            response.raise_for_status()
        except requests.RequestException:
            return {
                "available": False,
                "status": "Transit routing is temporarily unavailable.",
            }

        data = response.json()
        routes = data.get("routes") or []
        if not routes:
            return {
                "available": False,
                "status": "No public transport route was found for this trip right now.",
            }

        route = routes[0]
        transit_steps = [
            step
            for leg in route.get("legs", [])
            for step in leg.get("steps", [])
            if step.get("travelMode") == "TRANSIT" and step.get("transitDetails")
        ]

        if not transit_steps:
            return {
                "available": False,
                "status": "No public transport route was found for this trip right now.",
            }

        first_stop_details = transit_steps[0]["transitDetails"]["stopDetails"]
        last_stop_details = transit_steps[-1]["transitDetails"]["stopDetails"]
        transfers = len(transit_steps) - 1

        return {
            "available": True,
            "status": "No transfers needed." if transfers == 0 else f"{transfers} transfer(s) required.",
            "route_label": " → ".join(
                self._transit_line_label(step["transitDetails"]) for step in transit_steps
            ),
            "origin_stop_name": first_stop_details["departureStop"]["name"],
            "destination_stop_name": last_stop_details["arrivalStop"]["name"],
            "departure_time": self._format_iso_time(first_stop_details.get("departureTime")),
            "arrival_time": self._format_iso_time(last_stop_details.get("arrivalTime")),
            "travel_time_minutes": self._duration_to_minutes(route.get("duration")),
            "transfers": transfers,
            "next_departures": [],
        }

    def _transit_line_label(self, transit_details: dict) -> str:
        line = transit_details.get("transitLine") or {}
        return line.get("nameShort") or line.get("name") or "Transit"

    def _format_iso_time(self, value: str | None) -> str | None:
        if not value:
            return None

        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

        return parsed.astimezone(self.TIMEZONE).strftime("%-I:%M %p")

    def _duration_to_minutes(self, duration: str | None) -> int | None:
        if not duration or not duration.endswith("s"):
            return None

        try:
            return round(int(duration[:-1]) / 60)
        except ValueError:
            return None
