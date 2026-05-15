# Step 2.5: Infrastructure Verification


import sys
import os
sys.path.append(os.getcwd())

from app.core.config import settings
from app.db.session import engine
from app.services.storage import supabase
from sqlalchemy import text

def test_db():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database Connection: SUCCESS")
    except Exception as e:
        print(f"❌ Database Connection: FAILED\nError: {e}")

def test_supabase():
    try:
        # Just try to list buckets to verify API key
        supabase.storage.list_buckets()
        print("✅ Supabase API Client: SUCCESS")
    except Exception as e:
        print(f"❌ Supabase API Client: FAILED\nError: {e}")

if __name__ == "__main__":
    test_db()
    test_supabase()
