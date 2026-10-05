from fastapi import FastAPI

app = FastAPI(title="ResumeRadar API")


@app.get("/health")
def health_check():
    return {"status": "ok"}