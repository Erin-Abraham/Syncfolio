from fastapi import FastAPI

app = FastAPI(title="Syncfolio Engine", version="0.1.0")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "syncfolio-backend"}