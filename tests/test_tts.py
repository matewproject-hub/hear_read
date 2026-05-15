import asyncio
import sys
import os
sys.path.append(os.getcwd())

from app.services.tts import TTSService

async def run_test():
    print("🚀 Initializing TTS Service...")
    # This may take a few seconds to load the ONNX model into memory
    tts = TTSService()
    
    test_text = "Hello! I am the hear read audio assistant. I can now convert your documents into speech."
    print(f"Generating audio for: '{test_text}'")
    
    try:
        # We'll use the 'af_heart' voice (feminine, high quality)
        audio_path = await tts.generate_audio(test_text, voice="bm_george")
        
        print("\n✅ TTS Generation & Upload Successful!")
        print(f"File stored in Supabase at: {audio_path}")
        print("You can check your 'audio' bucket in the Supabase dashboard to hear it.")
        
    except Exception as e:
        print(f"❌ TTS Test Failed: {e}")
        print("\nPossible issues:")
        print("1. Did you create the 'audio' bucket in Supabase?")
        print("2. Is the 'audio' bucket policy set to allow INSERT?")
        print("3. Are 'kokoro-v0_19.onnx' and 'voices.json' in the root folder?")

if __name__ == "__main__":
    asyncio.run(run_test())
