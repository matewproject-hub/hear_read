import os
import sys
from sqlalchemy import text
from app.db.session import SessionLocal

def migrate():
    print("🚀 Starting migration: Adding coordinates column to text_blocks table...")
    db = SessionLocal()
    try:
        # Check if column already exists
        result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='text_blocks' AND column_name='coordinates';"))
        exists = result.fetchone()
        
        if not exists:
            print("📝 Adding 'coordinates' column (JSON type)...")
            db.execute(text("ALTER TABLE text_blocks ADD COLUMN coordinates JSON;"))
            db.commit()
            print("✅ Migration successful!")
        else:
            print("ℹ️ Column 'coordinates' already exists. Skipping.")
            
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Add project root to sys.path
    sys.path.append(os.getcwd())
    migrate()
