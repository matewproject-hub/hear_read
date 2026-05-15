import os
import sys
from sqlalchemy import text
from app.db.session import SessionLocal

def migrate():
    print("🚀 Starting migration: Adding page dimension columns to text_blocks table...")
    db = SessionLocal()
    try:
        # Add page_width
        result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='text_blocks' AND column_name='page_width';"))
        if not result.fetchone():
            print("📝 Adding 'page_width' column...")
            db.execute(text("ALTER TABLE text_blocks ADD COLUMN page_width INTEGER;"))
        
        # Add page_height
        result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='text_blocks' AND column_name='page_height';"))
        if not result.fetchone():
            print("📝 Adding 'page_height' column...")
            db.execute(text("ALTER TABLE text_blocks ADD COLUMN page_height INTEGER;"))
            
        db.commit()
        print("✅ Migration successful!")
            
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    migrate()
