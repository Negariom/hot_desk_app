import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import create_database_schema
from routers import buildings, cities, desks, features, floors, reservations
from services import auth

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
MAPS_DIR = STATIC_DIR / "maps"
MAPS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Hot Desk API")

@app.on_event("startup")
async def startup_event():
    """
    On startup, create the database schema if it doesn't exist.
    """
    print("Running startup event: Creating database schema...")
    await create_database_schema()
    print("Database schema check/creation complete.")


def _get_cors_origins() -> list[str]:
    configured_origins = os.getenv("CORS_ORIGINS")
    if configured_origins:
        origins = [origin.strip() for origin in configured_origins.split(",") if origin.strip()]
        if origins:
            return origins
    return ["http://localhost:5173", "http://127.0.0.1:5173"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

app.include_router(cities.router)
app.include_router(buildings.router)
app.include_router(floors.router)
app.include_router(desks.router)
app.include_router(features.router)
app.include_router(reservations.router)
app.include_router(auth.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("UVICORN_RELOAD", "true").lower() == "true",
    )