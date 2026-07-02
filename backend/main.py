from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class PlanRequest(BaseModel):
    origin: str
    destination: str
    leave_time: str
    preference: str

@app.post("/plan")
def plan_route(req: PlanRequest):
    return {
        "recommendation": "Take NX1 from Britomart to Albany Station.",
        "traffic": "Heavy traffic on Northern Motorway.",
        "reason": "Bus is more reliable than driving during peak time.",
        "eta": "Approx. 55 minutes"
    }