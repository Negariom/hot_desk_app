from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/desks",
    tags=["desks"],
)

@router.get("/", response_model=List[schemas.DeskWithAvailability])
async def read_desks_by_floor(
    floor_id: int,
    feature_id: list[int] = Query(default=[]),
    reservation_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve all desks for a given floor.
    If feature_id is provided (repeatable), only desks with ALL listed features are returned.
    If reservation_date is provided, each desk includes an is_reserved flag.
    """
    stmt = (
        select(models.Desk)
        .where(models.Desk.floor_id == floor_id)
        .options(
            selectinload(models.Desk.features).selectinload(models.DeskFeature.feature)
        )
    )
    for fid in feature_id:
        stmt = stmt.where(
            models.Desk.id.in_(
                select(models.DeskFeature.desk_id).where(models.DeskFeature.feature_id == fid)
            )
        )
    stmt = stmt.order_by(models.Desk.name)

    result = await db.execute(stmt)
    desks = result.scalars().unique().all()

    reserved_desk_ids: set[int] = set()
    if reservation_date is not None and desks:
        res_stmt = select(models.Reservation.desk_id).where(
            models.Reservation.desk_id.in_([d.id for d in desks]),
            models.Reservation.reservation_date == reservation_date,
            models.Reservation.status == "confirmed",
        )
        reserved_desk_ids = set((await db.execute(res_stmt)).scalars().all())

    for desk in desks:
        desk.is_reserved = desk.id in reserved_desk_ids

    return desks


@router.get("/{desk_id}/full", response_model=schemas.DeskFullDetails)
async def read_desk_full_details(desk_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieve desk details with full location chain (floor, building, city) and equipment.
    """
    stmt = (
        select(models.Desk)
        .where(models.Desk.id == desk_id)
        .options(
            selectinload(models.Desk.features).selectinload(models.DeskFeature.feature),
            selectinload(models.Desk.floor)
            .selectinload(models.Floor.building)
            .selectinload(models.Building.city),
        )
    )
    result = await db.execute(stmt)
    desk = result.scalar_one_or_none()
    if desk is None:
        raise HTTPException(status_code=404, detail="Desk not found")

    return schemas.DeskFullDetails(
        id=desk.id,
        name=desk.name,
        description=desk.description,
        is_active=desk.is_active,
        features=[
            schemas.DeskFeatureInfo(
                name=df.feature.name,
                category=df.feature.category,
                value=df.value,
            )
            for df in desk.features
        ],
        floor_number=desk.floor.floor_number,
        floor_description=desk.floor.description,
        building_name=desk.floor.building.name,
        building_address=desk.floor.building.address,
        city_name=desk.floor.building.city.name,
    )


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
