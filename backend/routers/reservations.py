from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth import get_current_user
from services.crud import (
    DeskMaintenanceError,
    DeskNotFoundError,
    UserNotFoundError,
    ReservationConflictError,
    create_reservation as create_reservation_record,
    get_desks_by_floor,
    get_floor,
    get_reservations_for_user,
)
from database import get_db
from models import Reservation as ReservationModel, User
from schemas import Desk, Reservation, ReservationCreate


router = APIRouter(tags=["reservations"])


class ReservationCreateRequest(BaseModel):
    desk_id: int
    reservation_date: date


@router.post("/reservations/", response_model=Reservation, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    reservation_in: ReservationCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Reservation:
    reservation_data = ReservationCreate(
        desk_id=reservation_in.desk_id,
        user_id=current_user.id,
        reservation_date=reservation_in.reservation_date,
    )

    try:
        return await create_reservation_record(db, reservation_data)
    except DeskNotFoundError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except UserNotFoundError as exc:
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
    current_user: User = Depends(get_current_user),
) -> list[Reservation]:
    return await get_reservations_for_user(db, current_user.id)


@router.delete("/reservations/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reservation(
    reservation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    reservation = await db.get(ReservationModel, reservation_id)
    if reservation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    if reservation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    await db.delete(reservation)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/desks/{floor_id}/availability", response_model=list[Desk])
async def get_floor_availability(
    floor_id: int,
    db: AsyncSession = Depends(get_db),
) -> list[Desk]:
    floor = await get_floor(db, floor_id)
    if floor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Floor not found")

    desks = await get_desks_by_floor(db, floor_id)
    return desks