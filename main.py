import os

from fastapi import FastAPI

from auth import router as auth_router
from routers import company
from routers import desks
from routers import reservations
from routers import reservation


app = FastAPI(title="Hot Desk API")

app.include_router(auth_router)
app.include_router(company.router)
app.include_router(desks.router)
app.include_router(reservations.router)
app.include_router(reservation.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("UVICORN_RELOAD", "true").lower() == "true",
    )