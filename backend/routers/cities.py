from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/cities",
    tags=["cities"],
)

@router.get("/", response_model=List[schemas.City])
async def read_cities(db: AsyncSession = Depends(get_db)):
    """
    Retrieve all cities.
    """
    result = await db.execute(select(models.City))
    cities = result.scalars().all()
    return cities
