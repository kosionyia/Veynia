from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool
from sqlmodel import SQLModel

# Import every domain's models so their tables register on SQLModel.metadata.
# A model module missing here is invisible to autogenerate.
import app.auth.models  # noqa: F401
from app.core.config import settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata

# The URL comes from .env via settings, never from alembic.ini, so the DB
# password lives in exactly one place.
DATABASE_URL = settings.database_url


def run_migrations_offline() -> None:
    """Emit SQL to stdout instead of running it (alembic upgrade head --sql)."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against the database."""
    # NullPool: a migration is a one-off run, no point keeping connections open.
    connectable = create_engine(DATABASE_URL, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
