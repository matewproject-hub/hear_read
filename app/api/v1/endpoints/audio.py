from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.text_block import TextBlock
from app.services.tts import TTSService
import io
import soundfile as sf

router = APIRouter()

# Initialize TTS service as a singleton
tts_service = TTSService()

@router.get("/stream/{block_id}")
async def stream_audio_for_block(
    block_id: int, 
    voice: str = "af_bella", 
    db: Session = Depends(get_db)
):
    """
    Generates audio on-the-fly for a specific text block and streams it back.
    """
    # 1. Fetch text block from DB
    block = db.query(TextBlock).filter(TextBlock.id == block_id).first()
    if not block:
        raise HTTPException(status_code=404, detail="Text block not found")
    
    if not block.content.strip():
        raise HTTPException(status_code=400, detail="Text block is empty")

    try:
        # 2. Generate audio samples using Kokoro
        # Note: tts_service.kokoro is the underlying kokoro-onnx instance
        samples, sample_rate = tts_service.kokoro.create(
            block.content, 
            voice=voice, 
            speed=1.0, 
            lang="en-us"
        )
        
        # 3. Convert samples to WAV format in an in-memory buffer
        buffer = io.BytesIO()
        sf.write(buffer, samples, sample_rate, format='wav')
        buffer.seek(0)
        
        # 4. Stream the audio file back to the client
        return StreamingResponse(
            buffer, 
            media_type="audio/wav",
            headers={"Content-Disposition": f"attachment; filename=block_{block_id}.wav"}
        )
        
    except Exception as e:
        print(f"❌ Streaming error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Audio generation failed: {str(e)}")
