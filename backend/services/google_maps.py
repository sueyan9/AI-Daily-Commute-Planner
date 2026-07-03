import requests

from core.config import settings


class GoogleMapsService:
    BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
    ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

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
