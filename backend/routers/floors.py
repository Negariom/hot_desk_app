from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/floors",
    tags=["floors"],
)

@router.get("/", response_model=List[schemas.Floor])
async def read_floors_by_building(building_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieve all floors for a given building.
    Returns an empty list if no floors are found.
    """
    result = await db.execute(select(models.Floor).where(models.Floor.building_id == building_id))
    floors = result.scalars().all()
    return floors
