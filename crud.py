"""Async SQLAlchemy CRUD helpers for the hot desk app."""

from datetime import datetime, timezone
from typing import Any, Optional, TypeVar

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models import Building, Desk, Employee, Floor, Reservation
from schemas import BuildingCreate, DeskCreate, FloorCreate, ReservationCreate

ModelType = TypeVar("ModelType")


class ReservationConflictError(ValueError):
    pass


class DeskNotFoundError(LookupError):
    pass


class EmployeeNotFoundError(LookupError):
    pass


class DeskMaintenanceError(ValueError):
    pass


def _normalize_datetime(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


async def _create_record(
    session: AsyncSession,
    model_class: type[ModelType],
    payload: dict[str, Any],
) -> ModelType:
    instance = model_class(**payload)
    session.add(instance)
    await session.commit()
    await session.refresh(instance)
    return instance


async def _get_record_by_id(
    session: AsyncSession,
    model_class: type[ModelType],
    record_id: int,
) -> Optional[ModelType]:
    result = await session.execute(select(model_class).where(model_class.id == record_id))
    return result.scalar_one_or_none()


async def _get_records(session: AsyncSession, model_class: type[ModelType]) -> list[ModelType]:
    result = await session.execute(select(model_class).order_by(model_class.id))
    return list(result.scalars().all())


async def create_building(session: AsyncSession, building_in: BuildingCreate) -> Building:
    return await _create_record(session, Building, building_in.model_dump())


async def get_building(session: AsyncSession, building_id: int) -> Optional[Building]:
    return await _get_record_by_id(session, Building, building_id)


async def get_buildings(session: AsyncSession) -> list[Building]:
    return await _get_records(session, Building)


async def create_floor(session: AsyncSession, floor_in: FloorCreate) -> Floor:
    return await _create_record(session, Floor, floor_in.model_dump())


async def get_floor(session: AsyncSession, floor_id: int) -> Optional[Floor]:
    return await _get_record_by_id(session, Floor, floor_id)


async def get_floors(session: AsyncSession) -> list[Floor]:
    return await _get_records(session, Floor)


async def create_desk(session: AsyncSession, desk_in: DeskCreate) -> Desk:
    return await _create_record(session, Desk, desk_in.model_dump())


async def get_desk(session: AsyncSession, desk_id: int) -> Optional[Desk]:
    return await _get_record_by_id(session, Desk, desk_id)


async def get_desks(session: AsyncSession) -> list[Desk]:
    return await _get_records(session, Desk)


async def create_reservation(session: AsyncSession, reservation_in: ReservationCreate) -> Reservation:
    start_time = _normalize_datetime(reservation_in.start_time)
    end_time = _normalize_datetime(reservation_in.end_time)

    if end_time <= start_time:
        raise ValueError("End time must be after start time")

    desk = await get_desk(session, reservation_in.desk_id)
    if desk is None:
        raise DeskNotFoundError(f"Desk {reservation_in.desk_id} not found")

    if desk.status == "maintenance":
        raise DeskMaintenanceError("Desk is under maintenance")

    employee = await _get_record_by_id(session, Employee, reservation_in.employee_id)
    if employee is None:
        raise EmployeeNotFoundError(f"Employee {reservation_in.employee_id} not found")

    conflict_query = select(Reservation.id).where(
        Reservation.desk_id == reservation_in.desk_id,
        Reservation.status == "active",
        Reservation.start_time < end_time,
        Reservation.end_time > start_time,
    )
    conflict_id = await session.scalar(conflict_query)
    if conflict_id is not None:
        raise ReservationConflictError("Desk already has an active reservation in the selected time range")

    reservation = Reservation(
        desk_id=reservation_in.desk_id,
        employee_id=reservation_in.employee_id,
        start_time=start_time,
        end_time=end_time,
        status=reservation_in.status,
    )
    session.add(reservation)

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise

    await session.refresh(reservation)
    return reservation
