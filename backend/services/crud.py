"""Async SQLAlchemy CRUD helpers for the hot desk app."""

from typing import Any, Optional, TypeVar

from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models import Building, Desk, DeskFeature, Floor, Reservation, User
from schemas import BuildingCreate, DeskCreate, DeskFeaturePayload, DeskMapPayload, FloorCreate, ReservationCreate

ModelType = TypeVar("ModelType")


class ReservationConflictError(ValueError):
    pass


class DeskNotFoundError(LookupError):
    pass


class UserNotFoundError(LookupError):
    pass


class DeskMaintenanceError(ValueError):
    pass


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


async def get_desks_by_floor(session: AsyncSession, floor_id: int) -> list[Desk]:
    result = await session.execute(
        select(Desk)
        .where(Desk.floor_id == floor_id)
        .order_by(Desk.name)
    )
    return list(result.scalars().all())


async def update_floor_map(
    session: AsyncSession,
    floor_id: int,
    svg_map_url: str,
) -> Optional[Floor]:
    floor = await get_floor(session, floor_id)
    if floor is None:
        return None

    floor.svg_map_url = svg_map_url
    session.add(floor)
    await session.commit()
    await session.refresh(floor)
    return floor


async def _sync_desk_features(
    session: AsyncSession,
    desk_id: int,
    features: list[DeskFeaturePayload],
) -> None:
    await session.execute(delete(DeskFeature).where(DeskFeature.desk_id == desk_id))
    if not features:
        return

    feature_rows = [
        DeskFeature(
            desk_id=desk_id,
            feature_id=feature.feature_id,
            value=feature.value,
        )
        for feature in features
    ]
    session.add_all(feature_rows)


async def upsert_desks_for_floor(
    session: AsyncSession,
    floor_id: int,
    desks_in: list[DeskMapPayload],
) -> list[Desk]:
    existing_ids = set(
        await session.scalars(select(Desk.id).where(Desk.floor_id == floor_id))
    )
    incoming_ids = {desk.id for desk in desks_in if desk.id is not None}
    deleted_ids = existing_ids - incoming_ids

    if deleted_ids:
        await session.execute(delete(DeskFeature).where(DeskFeature.desk_id.in_(deleted_ids)))
        await session.execute(delete(Reservation).where(Reservation.desk_id.in_(deleted_ids)))
        await session.execute(delete(Desk).where(Desk.id.in_(deleted_ids)))

    existing_desks: list[Desk] = []
    if incoming_ids:
        result = await session.execute(select(Desk).where(Desk.id.in_(incoming_ids)))
        existing_desks = list(result.scalars().all())

    existing_by_id = {desk.id: desk for desk in existing_desks}
    upserted_desks: list[Desk] = []

    for desk_in in desks_in:
        if desk_in.id is not None and desk_in.id in existing_by_id:
            desk = existing_by_id[desk_in.id]
            desk.name = desk_in.name
            desk.description = desk_in.description
            desk.x_pos = desk_in.x_pos
            desk.y_pos = desk_in.y_pos
            desk.is_active = desk_in.is_active
            await _sync_desk_features(session, desk.id, desk_in.features)
            upserted_desks.append(desk)
        else:
            desk = Desk(
                name=desk_in.name,
                description=desk_in.description,
                x_pos=desk_in.x_pos,
                y_pos=desk_in.y_pos,
                is_active=desk_in.is_active,
                floor_id=floor_id,
            )
            session.add(desk)
            await session.flush()
            await _sync_desk_features(session, desk.id, desk_in.features)
            upserted_desks.append(desk)

    await session.commit()
    for desk in upserted_desks:
        await session.refresh(desk)
    return upserted_desks


async def get_reservations_for_user(session: AsyncSession, user_id: int) -> list[Reservation]:
    result = await session.execute(
        select(Reservation)
        .where(Reservation.user_id == user_id)
        .order_by(Reservation.reservation_date.desc(), Reservation.id.desc())
    )
    return list(result.scalars().all())


async def create_reservation(session: AsyncSession, reservation_in: ReservationCreate) -> Reservation:
    desk = await get_desk(session, reservation_in.desk_id)
    if desk is None:
        raise DeskNotFoundError(f"Desk {reservation_in.desk_id} not found")

    if not desk.is_active:
        raise DeskMaintenanceError("Desk is inactive")

    user = await _get_record_by_id(session, User, reservation_in.user_id)
    if user is None:
        raise UserNotFoundError(f"User {reservation_in.user_id} not found")

    conflict_query = select(Reservation.id).where(
        Reservation.desk_id == reservation_in.desk_id,
        Reservation.reservation_date == reservation_in.reservation_date,
        Reservation.status == "confirmed",
    )
    conflict_id = await session.scalar(conflict_query)
    if conflict_id is not None:
        raise ReservationConflictError("Desk already has a confirmed reservation for this date")

    reservation = Reservation(
        desk_id=reservation_in.desk_id,
        user_id=reservation_in.user_id,
        reservation_date=reservation_in.reservation_date,
    )
    session.add(reservation)

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise

    await session.refresh(reservation)
    return reservation
