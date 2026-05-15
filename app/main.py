from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.endpoints import documents, audio

app = FastAPI(title=settings.PROJECT_NAME)

# Enable CORS for the Browser Extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, you would restrict this to your extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(
    documents.router, 
    prefix=f"{settings.API_V1_STR}/documents", 
    tags=["documents"]
)

app.include_router(
    audio.router,
    prefix=f"{settings.API_V1_STR}/audio",
    tags=["audio"]
)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": "0.1.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
