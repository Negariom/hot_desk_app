from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from typing import List

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/desks",
    tags=["desks"],
)

@router.get("/", response_model=List[schemas.Desk])
async def read_desks_by_floor(floor_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieve all desks for a given floor.
    Returns an empty list if no desks are found.
    """
    result = await db.execute(select(models.Desk).where(models.Desk.floor_id == floor_id))
    desks = result.scalars().all()
    return desks

@router.get("/{desk_id}/equipment", response_model=List[schemas.DeskFeature])
async def read_desk_equipment(desk_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieve all equipment (features) for a given desk.
    """
    result = await db.execute(
        select(models.DeskFeature)
        .options(joinedload(models.DeskFeature.feature))
        .where(models.DeskFeature.desk_id == desk_id)
    )
    features = result.scalars().all()
    return features
