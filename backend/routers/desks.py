from fastapi import APIRouter, Depends
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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

@router.post("/{desk_id}/reserve", response_model=schemas.Desk)
async def reserve_desk(desk_id: int, db: AsyncSession = Depends(get_db)):
    """
    Reserve a specific desk by changing its is_active status to False.
    """
    result = await db.execute(select(models.Desk).where(models.Desk.id == desk_id))
    desk = result.scalar_one_or_none()
    
    if not desk:
        raise HTTPException(status_code=404, detail="Biurko nie znalezione")
    if not desk.is_active:
        raise HTTPException(status_code=400, detail="Biurko jest już zajęte")
        
    desk.is_active = False
    await db.commit()
    await db.refresh(desk)
    
    return desk

@router.post("/{desk_id}/cancel", response_model=schemas.Desk)
async def cancel_reservation(desk_id: int, db: AsyncSession = Depends(get_db)):
    """
    Cancel a reservation for a specific desk by changing its is_active status to True.
    """
    result = await db.execute(select(models.Desk).where(models.Desk.id == desk_id))
    desk = result.scalar_one_or_none()
    
    if not desk:
        raise HTTPException(status_code=404, detail="Biurko nie znalezione")
    if desk.is_active:
        raise HTTPException(status_code=400, detail="Biurko nie jest zarezerwowane")
        
    desk.is_active = True
    await db.commit()
    await db.refresh(desk)
    
    return desk
