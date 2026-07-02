from fastapi import APIRouter
from pydantic import BaseModel
from services.google_maps import GoogleMapsService
from services.weather import WeatherService

router = APIRouter(prefix="/commute", tags=["Commute"])


class CommuteRequest(BaseModel):
    latitude: float
    longitude: float
    destination: str

google = GoogleMapsService()
weather = WeatherService()

@router.post("/plan")
async def plan_commute(request: CommuteRequest):
    address = google.reverse_geocode(
        request.latitude,
        request.longitude,
    )
    driving_route = google.get_driving_route(
        origin=address,
        destination=request.destination,
    )
    weather_data = weather.get_current_weather(
        request.latitude,
        request.longitude,
    )
    print("Driving route result:", driving_route)
    return {
        "current_location": address,
        "destination": request.destination,
        "driving_route": driving_route,
        "weather": weather_data,
    }