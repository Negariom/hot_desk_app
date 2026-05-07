import os
from typing import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from models import Base

load_dotenv()


def _build_async_database_url() -> str:
    database_url = os.getenv("DATABASE_URL") or os.getenv("DATABASE_ASYNC_URL")

    if database_url:
        if "+psycopg2" in database_url:
            database_url = database_url.replace("+psycopg2", "+asyncpg")
        elif database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

        return database_url

    postgres_user = os.getenv("POSTGRES_USER")
    postgres_password = os.getenv("POSTGRES_PASSWORD")
    postgres_host = os.getenv("POSTGRES_HOST")
    postgres_port = os.getenv("POSTGRES_PORT", "5432")
    postgres_db = os.getenv("POSTGRES_DB")

    missing_variables = [
        name
        for name, value in (
            ("POSTGRES_USER", postgres_user),
            ("POSTGRES_PASSWORD", postgres_password),
            ("POSTGRES_HOST", postgres_host),
            ("POSTGRES_DB", postgres_db),
        )
        if not value
    ]
    if missing_variables:
        raise RuntimeError(
            "Missing database configuration. Set DATABASE_URL or the following environment variables: "
            + ", ".join(missing_variables)
        )

    return (
        f"postgresql+asyncpg://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_db}"
    )


ASYNC_SQLALCHEMY_DATABASE_URL = _build_async_database_url()

async_engine = create_async_engine(ASYNC_SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(bind=async_engine, expire_on_commit=False)


async def create_database_schema() -> None:
    async with async_engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as db:
        yield db


if __name__ == "__main__":
    import asyncio

    asyncio.run(create_database_schema())