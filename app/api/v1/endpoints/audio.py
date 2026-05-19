import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.document import Document
from app.models.text_block import TextBlock
from app.services.tts import TTSService

router = APIRouter()

tts_service = TTSService()


# =========================================
# STREAM SINGLE BLOCK AUDIO
# =========================================

@router.get("/stream/{block_id}")
async def stream_audio(
    block_id: int,
    voice: str = "af_bella"
):

    db: Session = SessionLocal()

    try:

        block = (
            db.query(TextBlock)
            .filter(TextBlock.id == block_id)
            .first()
        )

        if not block:

            raise HTTPException(
                status_code=404,
                detail="Block not found"
            )

        audio_buffer = (
            tts_service.generate_audio_bytes(
                block.content,
                voice
            )
        )

        return StreamingResponse(
            audio_buffer,
            media_type="audio/wav",
            headers={
                "Cache-Control": "no-cache",
                "Accept-Ranges": "bytes"
            }
        )

    finally:

        db.close()


# =========================================
# STREAM FULL DOCUMENT AUDIO
# =========================================

@router.get("/document/{doc_id}")
async def get_document_audio(doc_id: int):

    db: Session = SessionLocal()

    try:

        doc = (
            db.query(Document)
            .filter(Document.id == doc_id)
            .first()
        )

        if not doc:

            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )

        return {
            "audio_url": doc.audio_path
        }

    finally:

        db.close()