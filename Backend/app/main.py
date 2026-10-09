from fastapi import FastAPI
from sqlmodel import select

from app.auth.router import router as auth_router
from app.core.db import SessionDep

app = FastAPI(title="ResumeRadar API")

app.include_router(auth_router)


@app.get("/health")
def health_check(session: SessionDep):
    # Round-trip to Postgres; raises (500) if the DB is unreachable.
    session.exec(select(1))
    return {"status": "ok", "db": "ok"}
