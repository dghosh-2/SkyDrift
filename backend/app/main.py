from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from .routers import (
    balloons_router,
    weather_router,
    fires_router,
    storms_router,
    location_router,
)

app = FastAPI(
    title="SkyDrift API",
    description="API for Windborne balloon constellation tracking",
    version="1.0.0",
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(balloons_router)
app.include_router(weather_router)
app.include_router(fires_router)
app.include_router(storms_router)
app.include_router(location_router)


@app.get("/")
async def root():
    return {"message": "SkyDrift API is running", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}

