import sys
import os
sys.path.append(os.getcwd())

from app.db.session import engine, Base
from app.models import User, Document, TextBlock

def init_db():
    print("Creating tables in Supabase...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully.")
    except Exception as e:
        print(f"❌ Failed to create tables.\nError: {e}")

if __name__ == "__main__":
    init_db()
