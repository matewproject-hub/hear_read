import httpx
import asyncio
import os

async def run_e2e_test():
    base_url = "http://localhost:8000/api/v1"
    
    # Check if test_sample.png exists
    if not os.path.exists("test_sample.png"):
        print("❌ Error: 'test_sample.png' not found in the root directory.")
        return

    # 1. Upload Document
    print("📤 Step 1: Uploading document...")
    async with httpx.AsyncClient() as client:
        try:
            with open("test_sample.png", "rb") as f:
                files = {"file": ("test_sample.png", f, "image/png")}
                resp = await client.post(f"{base_url}/documents/upload", files=files, timeout=60.0)
                
                if resp.status_code != 200:
                    print(f"❌ Upload failed: {resp.text}")
                    return
                    
                data = resp.json()
                doc_id = data["id"]
                print(f"✅ Uploaded! Doc ID: {doc_id}")
        except Exception as e:
            print(f"❌ Connection error during upload: {e}")
            return

    # 2. Wait for OCR
    print("⏳ Step 2: Waiting for OCR processing...")
    status = "processing"
    max_retries = 30
    retries = 0
    
    while status != "completed" and retries < max_retries:
        await asyncio.sleep(3)
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{base_url}/documents/")
            docs = resp.json()
            # Find our document in the list
            doc = next((d for d in docs if d["id"] == doc_id), None)
            
            if not doc:
                print("❌ Document not found in list!")
                return
                
            status = doc["status"]
            print(f"   Current Status: [{status}]")
            
            if status == "failed":
                print("❌ Processing failed on the server!")
                return
        retries += 1

    if status != "completed":
        print("❌ Timeout waiting for OCR processing.")
        return

    # 3. Get Text Blocks
    print("📖 Step 3: Fetching text blocks...")
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{base_url}/documents/{doc_id}/blocks")
        blocks = resp.json()
        
        if not blocks:
            print("❌ No text blocks found for this document.")
            return
            
        print(f"✅ Found {len(blocks)} blocks.")
        first_block = blocks[0]
        print(f"   Sample block text (ID {first_block['id']}): '{first_block['content']}'")

    # 4. Stream Audio
    # We'll pick a block with some content
    target_block = next((b for b in blocks if len(b['content'].strip()) > 3), blocks[0])
    print(f"🔊 Step 4: Streaming audio for block ID {target_block['id']}...")
    
    async with httpx.AsyncClient() as client:
        # We can specify the voice here (e.g., af_bella, am_adam, bf_emma)
        voice = "af_bella"
        resp = await client.get(f"{base_url}/audio/stream/{target_block['id']}?voice={voice}", timeout=30.0)
        
        if resp.status_code == 200:
            output_file = "final_test_output.wav"
            with open(output_file, "wb") as f:
                f.write(resp.content)
            print(f"✅ SUCCESS! Audio saved to '{output_file}'")
            print(f"   Voice used: {voice}")
        else:
            print(f"❌ Audio streaming failed: {resp.text}")

if __name__ == "__main__":
    asyncio.run(run_e2e_test())
