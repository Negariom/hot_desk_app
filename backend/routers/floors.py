import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

import models
import schemas
from database import get_db
from services.auth import require_admin
from services.crud import get_floor, update_floor_map, upsert_desks_for_floor

MAPS_DIR = Path(__file__).resolve().parent.parent / "static" / "maps"
MAPS_DIR.mkdir(parents=True, exist_ok=True)

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


@router.put("/{floor_id}/map", response_model=schemas.Floor)
async def upload_floor_map(
    floor_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _current_user=Depends(require_admin),
):
    floor = await get_floor(db, floor_id)
    if floor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Floor not found")

    extension = Path(file.filename or "").suffix
    if not extension:
        extension = ".svg"

    filename = f"floor_{floor_id}_{uuid4().hex}{extension}"
    target_path = MAPS_DIR / filename

    with target_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    svg_map_url = f"/static/maps/{filename}"
    updated_floor = await update_floor_map(db, floor_id, svg_map_url)
    if updated_floor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Floor not found")

    return updated_floor


@router.put("/{floor_id}/desks/batch", response_model=List[schemas.Desk])
async def upsert_floor_desks(
    floor_id: int,
    payload: schemas.DeskBatchPayload,
    db: AsyncSession = Depends(get_db),
    _current_user=Depends(require_admin),
):
    floor = await get_floor(db, floor_id)
    if floor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Floor not found")

    desks = await upsert_desks_for_floor(db, floor_id, payload.desks)
    return desks
