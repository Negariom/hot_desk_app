from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/desks",
    tags=["desks"],
)

@router.get("/", response_model=List[schemas.DeskWithFeatures])
async def read_desks_by_floor(
    floor_id: int,
    feature_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve all desks for a given floor.
    Returns an empty list if no desks are found.
    """
    stmt = (
        select(models.Desk)
        .where(models.Desk.floor_id == floor_id)
        .options(
            selectinload(models.Desk.features).selectinload(models.DeskFeature.feature)
        )
    )
    if feature_id is not None:
        stmt = stmt.join(models.DeskFeature).where(models.DeskFeature.feature_id == feature_id)
    stmt = stmt.order_by(models.Desk.name)

    result = await db.execute(stmt)
    desks = result.scalars().unique().all()
    return desks


@router.get("/{desk_id}", response_model=schemas.DeskWithFeatures)
async def read_desk_details(desk_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieve desk details with equipment (features).
    """
    stmt = (
        select(models.Desk)
        .where(models.Desk.id == desk_id)
        .options(
            selectinload(models.Desk.features).selectinload(models.DeskFeature.feature)
        )
    )
    result = await db.execute(stmt)
    desk = result.scalar_one_or_none()
    if desk is None:
        raise HTTPException(status_code=404, detail="Desk not found")
    return desk
