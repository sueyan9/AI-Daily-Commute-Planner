from fastapi import APIRouter
from pydantic import BaseModel
from services.planner import PlannerService

router = APIRouter(prefix="/commute", tags=["Commute"])


class CommuteRequest(BaseModel):
    latitude: float
    longitude: float
    destination: str


planner = PlannerService()


@router.post("/plan")
async def plan_commute(request: CommuteRequest):
    return planner.create_commute_plan(
        latitude=request.latitude,
        longitude=request.longitude,
        destination=request.destination,
    )
