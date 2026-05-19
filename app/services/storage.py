import os

from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


class StorageService:

    # =====================================
    # UPLOAD DOCUMENT
    # =====================================
    def upload_document(
        self,
        file_path: str,
        storage_name: str
    ):

        with open(file_path, "rb") as f:

            pdf_bytes = f.read()

        supabase.storage \
            .from_("documents") \
            .upload(
                path=storage_name,
                file=pdf_bytes,
                file_options={
                    "content-type": "application/pdf",
                    "upsert": "true"
                }
            )

        return supabase.storage \
            .from_("documents") \
            .get_public_url(storage_name)


    # =====================================
    # UPLOAD AUDIO
    # =====================================

    def upload_audio(
        self,
        file_path: str,
        storage_name: str
    ):

        with open(file_path, "rb") as f:

            audio_bytes = f.read()

        supabase.storage \
            .from_("audio") \
            .upload(
                path=storage_name,
                file=audio_bytes,
                file_options={
                    "content-type": "audio/wav",
                    "upsert": "true"
                }
            )

        return supabase.storage \
            .from_("audio") \
            .get_public_url(storage_name)
