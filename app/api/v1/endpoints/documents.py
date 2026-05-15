from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.document import Document, DocStatus
from app.services.storage import StorageService
from app.services.orchestrator import process_document_ocr_pipeline
import uuid
import os

router = APIRouter()

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Uploads a document, saves it locally for processing, and triggers the OCR pipeline.
    """
    # 1. Generate unique path
    file_ext = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    storage_path = f"uploads/{unique_filename}"
    
    # 2. Read content
    content = await file.read()
    
    # 3. Save locally for OCR processing
    os.makedirs("uploads", exist_ok=True)
    local_path = f"uploads/{unique_filename}"
    with open(local_path, "wb") as f:
        f.write(content)
    
    # 4. Upload to Supabase Storage (Optional/Async-safe)
    # If this fails, we still have the local file for OCR processing
    storage_success = StorageService.upload_file("documents", storage_path, content)
    if not storage_success:
        print("⚠️ Warning: Supabase storage upload failed, but proceeding with local OCR.")
    
    # 5. Create DB record
    new_doc = Document(
        filename=file.filename,
        storage_path=storage_path,
        status=DocStatus.PENDING
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    # 6. Trigger background OCR processing
    background_tasks.add_task(process_document_ocr_pipeline, new_doc.id, db)
    
    return {
        "id": new_doc.id, 
        "filename": new_doc.filename, 
        "status": "processing",
        "detail": "Document upload successful. OCR processing started in background."
    }

@router.get("/")
async def list_documents(db: Session = Depends(get_db)):
    """
    Lists all documents and their processing status.
    """
    return db.query(Document).all()

@router.get("/{doc_id}/blocks")
async def get_document_blocks(doc_id: int, db: Session = Depends(get_db)):
    """
    Returns the extracted text blocks for a specific document.
    """
    from app.models.text_block import TextBlock
    blocks = db.query(TextBlock).filter(TextBlock.document_id == doc_id).order_by(TextBlock.sequence_index).all()
    return blocks
