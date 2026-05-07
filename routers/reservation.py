from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from crud import (
	DeskMaintenanceError,
	DeskNotFoundError,
	EmployeeNotFoundError,
	ReservationConflictError,
	create_reservation as create_reservation_record,
)
from database import get_db
from schemas import Reservation, ReservationCreate

router = APIRouter(
	prefix="/reservation",
	tags=["reservation"]
)


@router.post("/", response_model=Reservation, status_code=201)
async def create_reservation(reservation: ReservationCreate, db: AsyncSession = Depends(get_db)):
	try:
		return await create_reservation_record(db, reservation)

	except DeskNotFoundError as exc:
		await db.rollback()
		raise HTTPException(status_code=404, detail=str(exc))
	except EmployeeNotFoundError as exc:
		await db.rollback()
		raise HTTPException(status_code=404, detail=str(exc))
	except DeskMaintenanceError as exc:
		await db.rollback()
		raise HTTPException(status_code=400, detail=str(exc))
	except ReservationConflictError as exc:
		await db.rollback()
		raise HTTPException(status_code=400, detail=str(exc))
	except ValueError as exc:
		await db.rollback()
		raise HTTPException(status_code=400, detail=str(exc))
	except HTTPException:
		await db.rollback()
		raise
	except Exception:
		await db.rollback()
		raise HTTPException(status_code=500, detail="Error creating reservation")
