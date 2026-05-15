from kokoro_onnx import Kokoro
import soundfile as sf
import io
from app.services.storage import StorageService
import uuid

class TTSService:
    def __init__(self, model_path="kokoro-v0_19.onnx", voices_path="voices.json"):
        # Initialize Kokoro (requires model and voices files)
        self.kokoro = Kokoro(model_path, voices_path)
        
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
