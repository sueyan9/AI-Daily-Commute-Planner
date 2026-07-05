from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.commute import router as commute_router

app = FastAPI(
    title="LeaveWise API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
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