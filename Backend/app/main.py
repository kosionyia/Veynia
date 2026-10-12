from fastapi import FastAPI
from sqlmodel import select

from app.analysis.router import router as analysis_router
from app.applications.router import router as applications_router
from app.auth.router import router as auth_router
from app.core.db import SessionDep
from app.cvs.router import router as cvs_router
from app.jobs.router import router as jobs_router

app = FastAPI(title="ResumeRadar API")

app.include_router(auth_router)
app.include_router(cvs_router)
app.include_router(jobs_router)
app.include_router(analysis_router)
app.include_router(applications_router)


@app.get("/health")
def health_check(session: SessionDep):
    # Round-trip to Postgres; raises (500) if the DB is unreachable.
    session.exec(select(1))
    return {"status": "ok", "db": "ok"}
