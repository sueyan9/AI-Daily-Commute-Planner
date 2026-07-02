import requests

from core.config import settings


class GoogleMapsService:

    BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

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

        response.raise_for_status()

        data = response.json()

        if data["status"] != "OK":
            return None

        return data["results"][0]["formatted_address"]