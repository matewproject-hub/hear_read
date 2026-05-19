from annotated_types import doc
import os
import shutil
import uuid
import requests
import tempfile

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    Request,
    UploadFile
)

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.document import Document
from app.models.text_block import TextBlock

from app.services.tts import TTSService
from app.services.storage import StorageService

router = APIRouter()

UPLOAD_DIR = "uploads"
AUDIO_DIR = "uploads/audio"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

tts_service = TTSService()
storage_service = StorageService()


# =========================================
# UPLOAD DOCUMENT
# =========================================

@router.post("/upload")
async def upload_document(  
    request: Request,
    file: UploadFile = File(...)
    ):

    db: Session = SessionLocal()

    # =====================================
    # SAVE TEMP PDF
    # =====================================

    ext = file.filename.split(".")[-1]

    filename = f"{uuid.uuid4()}.{ext}"

    local_pdf_path = os.path.join(
        UPLOAD_DIR,
        filename
    )

    with open(local_pdf_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # =====================================
    # UPLOAD PDF TO SUPABASE
    # =====================================

    pdf_public_url = (
        storage_service.upload_document(
            local_pdf_path,
            filename
        )
    )

    # =====================================
    # CREATE DB RECORD
    # =====================================

    doc = Document(
        filename=filename,
        original_name=file.filename,
        storage_path=pdf_public_url,
        status="processing"
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:

        # =====================================
        # OCR PROCESSING
        # =====================================

        ocr_service = request.app.state.ocr_service

        blocks = ocr_service.process_file(
            local_pdf_path
        )

        full_text = "\n".join(
            block["content"]
            for block in blocks
        )

        doc.full_text = full_text

        # =====================================
        # SAVE BLOCKS
        # =====================================

        for block in blocks:

            db.add(TextBlock(
                document_id=doc.id,
                content=block["content"],
                coordinates=block["coordinates"],
                page=block["page"],
                sequence_index=block["sequence_index"]
            ))

        db.commit()

        # =====================================
        # GENERATE FULL AUDIO
        # =====================================

        doc.status = "processing_audio"

        db.commit()

        local_audio_path = (
            f"{AUDIO_DIR}/document_{doc.id}.wav"
        )

        tts_service.generate_full_audio(
            text=full_text,
            output_path=local_audio_path,
            voice="af_bella"
        )

        # =====================================
        # UPLOAD AUDIO TO SUPABASE
        # =====================================

        audio_public_url = (
            storage_service.upload_audio(
                local_audio_path,
                f"document_{doc.id}.wav"
            )
        )

        # =====================================
        # SAVE AUDIO URL
        # =====================================

        doc.audio_path = audio_public_url

        doc.status = "completed"

        db.commit()

        # =====================================
        # CLEANUP TEMP FILES
        # =====================================

        if os.path.exists(local_pdf_path):
            os.remove(local_pdf_path)

        if os.path.exists(local_audio_path):
            os.remove(local_audio_path)
        
        doc_id = doc.id,
        doc_status = doc.status

    except Exception as e:

        doc.status = "failed"

        db.commit()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:

        db.close()

    return {
        "id": doc.id,
        "status": doc.status
    }


# =========================================
# GET DOCUMENT
# =========================================

@router.get("/{doc_id}")
def get_document(doc_id: int):

    db: Session = SessionLocal()

    try:

        doc = (
            db.query(Document)
            .filter(Document.id == doc_id)
            .first()
        )

        if not doc:

            raise HTTPException(
                status_code=404
            )

        return {
            "id": doc.id,
            "status": doc.status,
            "filename": doc.filename,
            "original_name": doc.original_name,
            "storage_path": doc.storage_path,
            "audio_path": doc.audio_path
        }

    finally:

        db.close()


# =========================================
# GET BLOCKS
# =========================================

@router.get("/{doc_id}/blocks")
def get_document_blocks(doc_id: int):

    db: Session = SessionLocal()

    try:

        blocks = (
            db.query(TextBlock)
            .filter(
                TextBlock.document_id == doc_id
            )
            .order_by(TextBlock.sequence_index)
            .all()
        )

        return [
            {
                "id": block.id,
                "content": block.content,
                "coordinates": block.coordinates,
                "page": block.page,
                "sequence_index": block.sequence_index
            }
            for block in blocks
        ]

    finally:

        db.close()


@router.get("/{doc_id}/timings")
def get_document_timings(doc_id: int):

    db = SessionLocal()

    try:

        doc = (
            db.query(Document)
            .filter(Document.id == doc_id)
            .first()
        )

        blocks = (
            db.query(TextBlock)
            .filter(TextBlock.document_id == doc_id)
            .order_by(TextBlock.sequence_index)
            .all()
        )

        if not doc or not doc.audio_path:

            raise HTTPException(
                status_code=404,
                detail="Missing document/audio"
            )

        import soundfile as sf

        audio_file = (
            f"uploads/audio/document_{doc.id}.wav"
        )

        audio_info = sf.info(audio_file)

        total_duration = audio_info.duration

        block_data = [
            {
                "id": block.id,
                "content": block.content
            }
            for block in blocks
        ]

        timings = (
            tts_service.generate_block_timings(
                block_data,
                total_duration
            )
        )

        return timings

    finally:

        db.close()

@router.get("/{doc_id}/timings")
def get_document_timings(doc_id: int):

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

        blocks = (
            db.query(TextBlock)
            .filter(TextBlock.document_id == doc_id)
            .order_by(TextBlock.sequence_index)
            .all()
        )

        if not blocks:

            return []

        # =====================================
        # ESTIMATE TOTAL AUDIO DURATION
        # =====================================

        total_chars = sum(
            len(block.content)
            for block in blocks
        )

        # average speech speed estimate
        # tweak later if needed

        estimated_total_duration = (
            total_chars / 15
        )

        timings = []

        current_time = 0

        for block in blocks:

            proportion = (
                len(block.content) /
                total_chars
            )

            duration = (
                estimated_total_duration *
                proportion
            )

            timings.append({
                "id": block.id,
                "start": current_time,
                "end": current_time + duration
            })

            current_time += duration

        return timings

    finally:

        db.close()