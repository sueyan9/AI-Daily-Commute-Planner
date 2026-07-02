from fastapi import APIRouter
from pydantic import BaseModel
from services.google_maps import GoogleMapsService

router = APIRouter(prefix="/commute", tags=["Commute"])


class CommuteRequest(BaseModel):
    latitude: float
    longitude: float
    destination: str

google = GoogleMapsService()

@router.post("/plan")
async def plan_commute(request: CommuteRequest):
    address = google.reverse_geocode(
        request.latitude,
        request.longitude,
    )

    return {
        "current_location": address,
        "destination": request.destination,
    }