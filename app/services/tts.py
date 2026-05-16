import io
import re
import soundfile as sf

from kokoro_onnx import Kokoro


class TTSService:

    def __init__(
        self,
        model_path="kokoro-v0_19.onnx",
        voices_path="voices.json"
    ):

        self.kokoro = Kokoro(
            model_path,
            voices_path
        )

    # =========================================
    # CLEAN OCR TEXT
    # =========================================

    def sanitize_text(self, text: str) -> str:

        if not text:
            return ""

        # remove weird unicode from OCR

        text = text.encode(
            "ascii",
            "ignore"
        ).decode()

        # normalize whitespace

        text = re.sub(r"\s+", " ", text)

        # punctuation spacing

        text = re.sub(
            r"([,.!?;:])(?=[^\s])",
            r"\1 ",
            text
        )

        text = text.strip()

        # natural sentence ending

        if text and text[-1] not in ".!?":
            text += "."

        return text

    # =========================================
    # GENERATE WAV AUDIO BYTES
    # =========================================

    def generate_audio_bytes(
        self,
        text: str,
        voice: str = "af_bella"
    ):

        clean_text = self.sanitize_text(text)

        samples, sample_rate = self.kokoro.create(
            clean_text,
            voice=voice,
            speed=1.0,
            lang="en-us"
        )

        audio_buffer = io.BytesIO()

        sf.write(
            audio_buffer,
            samples,
            sample_rate,
            format="WAV"
        )

        audio_buffer.seek(0)

        return audio_buffer