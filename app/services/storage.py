from supabase import create_client, Client
from app.core.config import settings

# Initialize the Supabase client
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

class StorageService:
    @staticmethod
    def upload_file(bucket_name: str, file_path: str, file_content: bytes):
        """
        Uploads a file to a Supabase storage bucket.
        """
        try:
            # Attempt upload
            res = supabase.storage.from_(bucket_name).upload(
                path=file_path,
                file=file_content,
                file_options={"x-upsert": "true"}
            )
            return res
        except Exception as e:
            print(f"❌ Storage upload error: {str(e)}")
            # We return None instead of crashing the whole pipeline
            # This allows the local OCR to still work if needed
            return None

    @staticmethod
    def get_file_url(bucket_name: str, file_path: str):
        """
        Generates a public URL for a file in a Supabase bucket.
        """
        return supabase.storage.from_(bucket_name).get_public_url(file_path)
