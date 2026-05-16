from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.endpoints import audio, documents
from app.services.ocr import OCRService
from app.services.tts import TTSService


@asynccontextmanager
async def lifespan(app: FastAPI):

    print("Loading OCR service...")
    app.state.ocr_service = OCRService()

    print("Loading TTS service...")
    app.state.tts_service = TTSService()

    yield

    print("Shutting down...")


app = FastAPI(
    title="HearRead",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    documents.router,
    prefix="/api/v1/documents",
    tags=["documents"]
)

app.include_router(
    audio.router,
    prefix="/api/v1/audio",
    tags=["audio"]
)


app.mount(
    "/static",
    StaticFiles(directory="frontend"),
    name="static"
)


@app.get("/")
async def root():
    return FileResponse("frontend/index.html")