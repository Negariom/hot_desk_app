import asyncio
import os
import random
from datetime import date, timedelta

from faker import Faker
from sqlalchemy import insert, text

import models
from database import async_engine, AsyncSessionLocal
from services.auth import get_password_hash, normalize_email

fake = Faker("pl_PL")

CITIES_TO_CREATE = ["Wrocław", "Warszawa", "Kraków"]
BUILDINGS_PER_CITY_RANGE = (2, 5)
FLOORS_PER_BUILDING_RANGE = (3, 8)
DESKS_PER_FLOOR_RANGE = (10, 20)
FEATURES_TO_CREATE = [
    {"name": "Monitor", "category": "Hardware"},
    {"name": "Fotel ergonomiczny", "category": "Ergonomia"},
    {"name": "Stacja dokująca", "category": "Hardware"},
    {"name": "Biurko z regulacją wysokości", "category": "Ergonomia"},
    {"name": "Klawiatura mechaniczna", "category": "Hardware"},
    {"name": "Myszka bezprzewodowa", "category": "Hardware"},
    {"name": "Podkładka pod nadgarstki", "category": "Ergonomia"},
]

ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "password123")


async def recreate_schema() -> None:
    print("Recreating database schema...")
    async with async_engine.begin() as conn:
        for table in reversed(models.Base.metadata.sorted_tables):
            await conn.execute(text(f'DROP TABLE IF EXISTS "{table.name}" CASCADE;'))

    async with async_engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
    print("Schema recreated successfully.")


async def seed_data() -> None:
    start_time = asyncio.get_running_loop().time()

    await recreate_schema()

    async with AsyncSessionLocal() as session:
        print("Creating cities...")
        city_rows = [{"name": name} for name in CITIES_TO_CREATE]
        city_ids = (
            await session.execute(insert(models.City).returning(models.City.id), city_rows)
        ).scalars().all()
        await session.commit()
        print(f"-> Created {len(city_ids)} cities.")

        print("Creating buildings...")
        building_rows = []
        for city_id in city_ids:
            for _ in range(random.randint(*BUILDINGS_PER_CITY_RANGE)):
                building_rows.append(
                    {
                        "name": f"Biurowiec {fake.company_suffix()}",
                        "address": fake.street_address(),
                        "city_id": city_id,
                    }
                )
        building_ids = (
            await session.execute(insert(models.Building).returning(models.Building.id), building_rows)
        ).scalars().all()
        await session.commit()
        print(f"-> Created {len(building_ids)} buildings.")

        print("Creating floors...")
        floor_rows = []
        for building_id in building_ids:
            for i in range(random.randint(*FLOORS_PER_BUILDING_RANGE)):
                floor_rows.append(
                    {
                        "floor_number": i,
                        "building_id": building_id,
                        "description": f"Piętro {i}",
                    }
                )
        floor_ids = (
            await session.execute(insert(models.Floor).returning(models.Floor.id), floor_rows)
        ).scalars().all()
        await session.commit()
        print(f"-> Created {len(floor_ids)} floors.")

        print("Creating desks...")
        desk_rows = []
        for floor_id in floor_ids:
            for i in range(random.randint(*DESKS_PER_FLOOR_RANGE)):
                desk_rows.append(
                    {
                        "name": f"Biurko {i + 1:02d}",
                        "floor_id": floor_id,
                        "is_active": random.choice([True, False]),
                        "x_pos": round(random.uniform(10, 90), 2),
                        "y_pos": round(random.uniform(10, 90), 2),
                    }
                )
        desk_ids = (
            await session.execute(insert(models.Desk).returning(models.Desk.id), desk_rows)
        ).scalars().all()
        await session.commit()
        print(f"-> Created {len(desk_ids)} desks.")

        print("Creating features...")
        feature_ids = (
            await session.execute(insert(models.Feature).returning(models.Feature.id), FEATURES_TO_CREATE)
        ).scalars().all()
        await session.commit()
        print(f"-> Created {len(feature_ids)} features.")

        print("Assigning features to desks...")
        desk_feature_rows = []
        all_features = await session.execute(text("SELECT id, name FROM feature"))
        feature_map = {feature.id: feature.name for feature in all_features.all()}

        for desk_id in desk_ids:
            selected_feature_ids = random.sample(feature_ids, k=random.randint(1, len(feature_ids)))
            for feature_id in selected_feature_ids:
                value = None
                feature_name = feature_map.get(feature_id)

                if feature_name == "Monitor":
                    value = random.choice(
                        [
                            "24-calowy Dell",
                            "27-calowy HP",
                            "32-calowy Samsung 4K",
                            "2x 24-calowy Dell",
                        ]
                    )
                elif feature_name == "Stacja dokująca":
                    value = random.choice(
                        ["Dell WD19S", "HP Thunderbolt G4", "Lenovo ThinkPad Universal"]
                    )
                elif feature_name == "Fotel ergonomiczny":
                    value = random.choice(["Ergohuman", "Herman Miller Aeron", "Markus IKEA"])
                elif feature_name == "Biurko z regulacją wysokości":
                    value = random.choice(["Elektryczne", "Manualne"])

                desk_feature_rows.append({"desk_id": desk_id, "feature_id": feature_id, "value": value})

        await session.execute(insert(models.DeskFeature), desk_feature_rows)
        await session.commit()
        print(f"-> Assigned {len(desk_feature_rows)} features.")

        print("Creating admin user...")
        admin_email = normalize_email(ADMIN_EMAIL)
        user_row = {
            "email": admin_email,
            "password_hash": get_password_hash(ADMIN_PASSWORD),
            "name": "Admin",
            "surname": "User",
            "role": "admin",
        }
        user_id = (
            await session.execute(insert(models.User).returning(models.User.id), [user_row])
        ).scalar_one()
        await session.commit()
        print(f"-> Created user '{admin_email}' with password '{ADMIN_PASSWORD}'.")

        print("Creating reservations...")
        reservation_rows = []
        for _ in range(10):
            reservation_rows.append(
                {
                    "reservation_date": date.today() + timedelta(days=random.randint(1, 14)),
                    "user_id": user_id,
                    "desk_id": random.choice(desk_ids),
                }
            )
        await session.execute(insert(models.Reservation), reservation_rows)
        await session.commit()
        print(f"-> Created {len(reservation_rows)} reservations.")

    end_time = asyncio.get_running_loop().time()
    print(f"\nDatabase seeding finished in {end_time - start_time:.2f} seconds.")


if __name__ == "__main__":
    asyncio.run(seed_data())
