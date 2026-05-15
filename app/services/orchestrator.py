from sqlalchemy.orm import Session
from app.models.document import Document, DocStatus
from app.models.text_block import TextBlock
from app.services.ocr import OCRService
import os

# Initialize OCR service as a singleton
ocr_service = OCRService()

async def process_document_ocr_pipeline(doc_id: int, db: Session):
    """
    Background task to extract text blocks from a document (Image or PDF).
    """
    # 1. Update status to PROCESSING
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        return
    
    doc.status = DocStatus.PROCESSING
    db.commit()

    try:
        # 2. Get local path
        local_path = f"uploads/{os.path.basename(doc.storage_path)}"
        
        print(f"🚀 Starting Multi-Format OCR Pipeline for Doc ID: {doc_id}")
        
        # 3. Run OCR (Handles both PDF and Images automatically)
        blocks = ocr_service.process_file(local_path)
        
        # 4. Save extracted blocks to DB
        print(f"📄 Saving {len(blocks)} text blocks to database...")
        for block_data in blocks:
            new_block = TextBlock(
                document_id=doc.id,
                content=block_data['content'],
                page_number=block_data['page_number'],
                sequence_index=block_data['sequence_index'],
                coordinates=block_data['coordinates'],
                page_width=block_data.get('page_width'),
                page_height=block_data.get('page_height')
            )
            db.add(new_block)
        
        # 5. Finalize status
        doc.status = DocStatus.COMPLETED
        db.commit()
        print(f"✅ OCR Pipeline completed for Doc ID: {doc_id}")
        
    except Exception as e:
        print(f"❌ Pipeline error for Doc ID {doc_id}: {str(e)}")
        db.rollback()
        doc.status = DocStatus.FAILED
        db.commit()
