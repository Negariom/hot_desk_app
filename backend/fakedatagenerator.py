import asyncio
import random
import time
from datetime import datetime, timedelta

from faker import Faker
from sqlalchemy import insert, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from services.auth import get_password_hash
from database import AsyncSessionLocal
from models import Building, Company, Desk, Employee, Floor, Location, Reservation

fake = Faker("en_US")

# --- ZALECENIA PROWADZĄCEGO ---
CITIES_COUNT = 100
BUILDINGS_TOTAL = 100  # 1 budynek na miasto
FLOORS_PER_BUILDING = 10
DESKS_PER_FLOOR = 100

# Parametry rezerwacji
DAYS_OF_OPERATION = 300
RESERVATIONS_PER_DESK = 3  # 100,000 biurek * 3 = 300,000 rezerwacji

BATCH_SIZE = 100000

DESK_STATUSES = ("available", "occupied", "maintenance")
DESK_EQUIPMENT = (
    "monitor, ergonomic chair",
    "monitor, ergonomic chair, docking station",
    "dual monitor, ergonomic chair",
    "monitor, standing desk",
)

TEST_EMPLOYEE_PASSWORD = "password123"

async def bulk_insert_ids(session: AsyncSession, table, rows):
    if not rows:
        return []
    statement = insert(table).returning(table.id)
    result = await session.execute(statement, rows)
    return result.scalars().all()

async def flush_batch(session: AsyncSession, table, batch, inserted_count, total_count, entity_name):
    if not batch:
        return inserted_count

    await session.execute(insert(table), batch)
    await session.commit()

    inserted_count += len(batch)
    print(f"Inserted {inserted_count} / {total_count} {entity_name}...")
    batch.clear()
    return inserted_count

async def clear_seed_data(session: AsyncSession):
    await session.execute(
        text(
            "TRUNCATE TABLE reservation, desk, floor, work_group_building, work_group, employee, building, location, user_group, company RESTART IDENTITY CASCADE"
        )
    )
    await session.commit()

async def seed_database():
    start_time = time.time()

    async with AsyncSessionLocal() as session:
        print("Clearing previously generated data...")
        await clear_seed_data(session)

        # Generujemy jedną główną firmę dla uproszczenia (lub więcej, jeśli wolisz)
        print("Generating company...")
        company_id = (await bulk_insert_ids(session, Company, [{"name": "Global Corp", "group_name": "Group 01"}]))[0]
        await session.commit()

        print(f"Generating {CITIES_COUNT} cities (locations)...")
        locations_data = [
            {
                "country": fake.country()[:50],
                "city": fake.city()[:100],
            }
            for _ in range(CITIES_COUNT)
        ]
        location_ids = await bulk_insert_ids(session, Location, locations_data)

        print(f"Generating {BUILDINGS_TOTAL} buildings (1 per city)...")
        buildings_data = [
            {
                "name": f"Bldg {i+1:03d} - {fake.company_suffix()}",
                "address": fake.street_address()[:100],
                "location_id": location_ids[i], # Poprawiona literówka z Twojego kodu (location_100id -> location_id)
                "company_id": company_id,
            }
            for i in range(BUILDINGS_TOTAL)
        ]
        building_ids = await bulk_insert_ids(session, Building, buildings_data)
        await session.commit()

        total_floors = BUILDINGS_TOTAL * FLOORS_PER_BUILDING
        print(f"Generating {total_floors} floors...")
        floors_data = []
        for building_id in building_ids:
            for level in range(1, FLOORS_PER_BUILDING + 1):
                floors_data.append({
                    "building_id": building_id,
                    "level": level,
                    "name": f"Floor {level}",
                })
        floor_ids = await bulk_insert_ids(session, Floor, floors_data)
        await session.commit()

        total_desks = total_floors * DESKS_PER_FLOOR
        print(f"Generating {total_desks} desks (this might take a while)...")
        desks_batch = []
        desks_inserted = 0

        for floor_index, floor_id in enumerate(floor_ids, start=1):
            floor_level = ((floor_index - 1) % FLOORS_PER_BUILDING) + 1
            for desk_number in range(1, DESKS_PER_FLOOR + 1):
                desks_batch.append({
                    "floor_id": floor_id,
                    "label": f"F{floor_level:02d}-D{desk_number:03d}",
                    "status": DESK_STATUSES[(desk_number + floor_level) % len(DESK_STATUSES)],
                    "equipment": DESK_EQUIPMENT[(desk_number + floor_index) % len(DESK_EQUIPMENT)],
                })

                if len(desks_batch) >= BATCH_SIZE:
                    desks_inserted = await flush_batch(session, Desk, desks_batch, desks_inserted, total_desks, "desks")

        desks_inserted = await flush_batch(session, Desk, desks_batch, desks_inserted, total_desks, "desks")

        
        print("Generating test employee...")
        employee_id = (await bulk_insert_ids(session, Employee, [{
            "first_name": "Test",
            "last_name": "User",
            "email": "test@example.com",
            "hash_password": get_password_hash(TEST_EMPLOYEE_PASSWORD),
        }]))[0]
        await session.commit()

        # --- GENEROWANIE 300 000 REZERWACJI ---
        total_reservations = total_desks * RESERVATIONS_PER_DESK
        print(f"Generating {total_reservations} reservations for a 300-day period...")
        
        # Pobieramy ID wygenerowanych biurek (będą potrzebne do stworzenia relacji)
        all_desk_ids = (await session.execute(select(Desk.id))).scalars().all()
        
        base_date = datetime.now()
        reservations_batch = []
        reservations_inserted = 0

        for desk_id in all_desk_ids:
            # Losujemy 3 UNIKALNE dni z przedziału ostatnich 300 dni
            random_days_offsets = random.sample(range(DAYS_OF_OPERATION), RESERVATIONS_PER_DESK)
            
            for offset in random_days_offsets:
                reservation_start = base_date - timedelta(days=offset)
                reservation_end = reservation_start + timedelta(hours=8)
                
                # Dostosuj nazwy kolumn poniżej do swojego modelu `Reservation`
                reservations_batch.append({
                    "desk_id": desk_id,
                    "start_time": reservation_start,
                    "end_time": reservation_end,
                    "employee_id": employee_id,
                    "status": "reserved"
                })

            if len(reservations_batch) >= BATCH_SIZE:
                reservations_inserted = await flush_batch(session, Reservation, reservations_batch, reservations_inserted, total_reservations, "reservations")

        reservations_inserted = await flush_batch(session, Reservation, reservations_batch, reservations_inserted, total_reservations, "reservations")

        end_time = time.time()
        print(f"\nFinished successfully! Duration: {round(end_time - start_time, 2)} seconds.")

if __name__ == "__main__":
    asyncio.run(seed_database())