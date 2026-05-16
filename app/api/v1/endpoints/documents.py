import os
import shutil
import uuid

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.document import Document
from app.models.text_block import TextBlock

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...)
):

    db: Session = SessionLocal()

    ext = file.filename.split(".")[-1]

    filename = f"{uuid.uuid4()}.{ext}"

    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc = Document(
        filename=filename,
        original_name=file.filename,
        storage_path=filepath,
        status="processing"
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:

        ocr_service = request.app.state.ocr_service

        blocks = ocr_service.process_file(filepath)

        for block in blocks:

            db.add(TextBlock(
                document_id=doc.id,
                content=block["content"],
                coordinates=block["coordinates"],
                page=block["page"],
                sequence_index=block["sequence_index"]
            ))

        doc.status = "completed"

        db.commit()

    except Exception as e:

        doc.status = "failed"

        db.commit()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    return {
        "id": doc.id,
        "status": doc.status
    }


@router.get("/{doc_id}")
def get_document(doc_id: int):

    db: Session = SessionLocal()

    doc = (
        db.query(Document)
        .filter(Document.id == doc_id)
        .first()
    )

    if not doc:
        raise HTTPException(status_code=404)

    return {
        "id": doc.id,
        "status": doc.status,
        "filename": doc.filename,
        "original_name": doc.original_name
    }


@router.get("/{doc_id}/blocks")
def get_document_blocks(doc_id: int):

    db: Session = SessionLocal()

    blocks = (
        db.query(TextBlock)
        .filter(TextBlock.document_id == doc_id)
        .order_by(TextBlock.sequence_index)
        .all()
    )

    return [
        {
            "id": block.id,
            "content": block.content,
            "page": block.page,
            "sequence_index": block.sequence_index
        }
        for block in blocks
    ]