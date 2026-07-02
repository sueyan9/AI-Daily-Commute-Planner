import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")


class GoogleMapsService:

    BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

    def reverse_geocode(self, lat: float, lng: float):

        params = {
            "latlng": f"{lat},{lng}",
            "key": API_KEY,
        }

        response = requests.get(self.BASE_URL, params=params)

        response.raise_for_status()

        data = response.json()

        if not data["results"]:
            return None

        return data["results"][0]["formatted_address"]