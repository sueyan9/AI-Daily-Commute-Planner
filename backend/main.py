from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.commute import router as commute_router

app = FastAPI(
    title="LeaveWise API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(commute_router)


@app.get("/")
def root():
    return {
        "message": "LeaveWise API is running."
    }