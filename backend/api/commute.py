from fastapi import APIRouter
from pydantic import BaseModel
from services.planner import PlannerService

router = APIRouter(prefix="/commute", tags=["Commute"])


class CommuteRequest(BaseModel):
    latitude: float
    longitude: float
    destination: str
    arrival_time: str | None = None
    preference: str | None = None


planner = PlannerService()


@router.post("/plan")
async def plan_commute(request: CommuteRequest):
    return planner.create_commute_plan(
        latitude=request.latitude,
        longitude=request.longitude,
        destination=request.destination,
        arrival_time=request.arrival_time,
        preference=request.preference,
    )
