from kokoro_onnx import Kokoro
import soundfile as sf
import io
from app.services.storage import StorageService
import uuid

class TTSService:
    def __init__(self, model_path="kokoro-v0_19.onnx", voices_path="voices.json"):
        # Initialize Kokoro (requires model and voices files)
        self.kokoro = Kokoro(model_path, voices_path)

    def sanitize_text(self, text: str) -> str:
        """
        Aggressively cleans up text to eliminate Kokoro word-count mismatches.
        """
        import re
        if not text: return ""
        
        # 1. Remove non-ASCII characters (often found in PDFs)
        text = text.encode("ascii", "ignore").decode()
        
        # 2. Normalize all whitespace (tabs, newlines, multiple spaces) to a single space
        text = re.sub(r'\s+', ' ', text)
        
        # 3. Fix punctuation spacing (e.g., "Hello,world" -> "Hello, world")
        text = re.sub(r'([,.!?;:])(?=[^\s])', r'\1 ', text)
        
        # 4. Final trim
        text = text.strip()
        
        # 5. Ensure it ends with a punctuation mark for natural flow
        if text and text[-1] not in ".!?":
            text += "."
            
        return text

    def create_audio(self, text: str, voice: str):
        """
        Safe wrapper for Kokoro audio creation with sanitization.
        """
        clean_text = self.sanitize_text(text)
        return self.kokoro.create(clean_text, voice=voice, speed=1.0, lang="en-us")
        
    async def generate_audio(self, text: str, voice: str = "af_heart"):
        """
        Generates audio for a given text and uploads it to Supabase.
        """
        # 1. Generate audio with Kokoro
        samples, sample_rate = self.kokoro.create(text, voice=voice, speed=1.0, lang="en-us")
        
        # 2. Convert to audio file format in memory
        buffer = io.BytesIO()
        sf.write(buffer, samples, sample_rate, format='wav')
        buffer.seek(0)
        
        # 3. Upload to Supabase 'audio' bucket
        file_path = f"segments/{uuid.uuid4()}.wav"
        StorageService.upload_file("audio", file_path, buffer.read())
        
        return file_path
