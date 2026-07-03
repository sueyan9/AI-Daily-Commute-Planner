from services.google_maps import GoogleMapsService
from services.llm import LLMService
from services.weather import WeatherService


class PlannerService:
    def __init__(self) -> None:
        self.google_maps = GoogleMapsService()
        self.weather = WeatherService()
        self.llm = LLMService()

    def create_commute_plan(
        self,
        *,
        latitude: float,
        longitude: float,
        destination: str,
    ) -> dict:
        current_location = self.google_maps.reverse_geocode(latitude, longitude)
        driving_route = None

        if current_location:
            driving_route = self.google_maps.get_driving_route(
                origin=current_location,
                destination=destination,
            )

        weather = self.weather.get_current_weather(latitude, longitude)
        recommendation = self.llm.generate_commute_recommendation(
            current_location=current_location,
            destination=destination,
            driving_route=driving_route,
            weather=weather,
        )

        return {
            "current_location": current_location,
            "destination": destination,
            "driving_route": driving_route,
            "weather": weather,
            "recommendation": recommendation,
        }
