import os
from collections.abc import Iterator

# Before importing the app: tests reset the counters between runs, which must
# never wipe the dev Redis (and the suite shouldn't need Redis running).
os.environ["RATE_LIMIT_STORAGE_URL"] = "memory://"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlmodel import Session, SQLModel

import app.auth.models  # noqa: F401  (register tables on SQLModel.metadata)
import app.cvs.models  # noqa: F401  (register tables on SQLModel.metadata)
import app.jobs.models  # noqa: F401  (register tables on SQLModel.metadata)
import app.analysis.models  # noqa: F401  (register tables on SQLModel.metadata)
import app.applications.models  # noqa: F401  (register tables on SQLModel.metadata)
from app.core import rate_limit
from app.core.config import settings
from app.core.db import get_session
from app.main import app

# Same server as dev, separate database, so tests never touch dev data.
TEST_URL = make_url(settings.database_url).set(database="resumeradar_test")


def _ensure_test_database() -> None:
    admin = create_engine(
        make_url(settings.database_url).set(database="postgres"),
        isolation_level="AUTOCOMMIT",  # CREATE DATABASE can't run in a transaction
    )
    with admin.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": TEST_URL.database},
        ).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{TEST_URL.database}"'))
    admin.dispose()


@pytest.fixture(scope="session")
def engine():
    _ensure_test_database()
    engine = create_engine(TEST_URL)
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine) -> Iterator[Session]:
    with Session(engine) as session:
        yield session
    # Clean slate for the next test.
    with engine.begin() as conn:
        for table in reversed(SQLModel.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture(autouse=True)
def reset_rate_limits():
    # Counters are module-level; without this one test's attempts leak into the next.
    rate_limit.storage.reset()


@pytest.fixture
def client(session: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_session] = lambda: session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
