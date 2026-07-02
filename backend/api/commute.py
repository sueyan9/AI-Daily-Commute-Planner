from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/commute", tags=["Commute"])


class CommuteRequest(BaseModel):
    origin: str
    destination: str


@router.post("/plan")
async def plan_commute(request: CommuteRequest):
    return {
        "status": "success",
        "message": "Backend connected successfully!",
        "origin": request.origin,
        "destination": request.destination,
    }