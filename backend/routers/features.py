from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/features",
    tags=["features"],
)


@router.get("/", response_model=List[schemas.Feature])
async def read_features(db: AsyncSession = Depends(get_db)):
    """
    Retrieve all features for desks.
    """
    result = await db.execute(select(models.Feature).order_by(models.Feature.category, models.Feature.name))
    return result.scalars().all()
