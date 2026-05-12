from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/buildings",
    tags=["buildings"],
)

@router.get("/", response_model=List[schemas.Building])
async def read_buildings_by_city(city_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieve all buildings for a given city.
    Returns an empty list if no buildings are found.
    """
    result = await db.execute(select(models.Building).where(models.Building.city_id == city_id))
    buildings = result.scalars().all()
    return buildings
