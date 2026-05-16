from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.services.tts import TTSService
from app.db.session import SessionLocal
from app.models.text_block import TextBlock

router = APIRouter()

tts_service = TTSService()


@router.get("/stream/{block_id}")
async def stream_audio(
    block_id: int,
    voice: str = "af_bella"
):

    db = SessionLocal()

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