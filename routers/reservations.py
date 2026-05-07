from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from auth import get_current_user
from crud import (
    DeskMaintenanceError,
    DeskNotFoundError,
    EmployeeNotFoundError,
    ReservationConflictError,
    create_reservation as create_reservation_record,
    get_desks_by_floor,
    get_floor,
    get_reservations_for_employee,
)
from database import get_db
from models import Employee
from schemas import DeskOut, Reservation, ReservationCreate


router = APIRouter(tags=["reservations"])


class ReservationCreateRequest(BaseModel):
    desk_id: int
    start_time: datetime
    end_time: datetime


@router.post("/reservations/", response_model=Reservation, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    reservation_in: ReservationCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
) -> Reservation:
    reservation_data = ReservationCreate(
        desk_id=reservation_in.desk_id,
        employee_id=current_user.id,
        start_time=reservation_in.start_time,
        end_time=reservation_in.end_time,
        status="active",
    )

    try:
        return await create_reservation_record(db, reservation_data)
    except DeskNotFoundError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except EmployeeNotFoundError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except DeskMaintenanceError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except ReservationConflictError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except ValueError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error creating reservation")


@router.get("/reservations/me", response_model=list[Reservation])
async def get_my_reservations(
    db: AsyncSession = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
) -> list[Reservation]:
    return await get_reservations_for_employee(db, current_user.id)


@router.get("/desks/{floor_id}/availability", response_model=list[DeskOut])
async def get_floor_availability(
    floor_id: int,
    db: AsyncSession = Depends(get_db),
) -> list[DeskOut]:
    floor = await get_floor(db, floor_id)
    if floor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Floor not found")

    desks = await get_desks_by_floor(db, floor_id)
    return desks