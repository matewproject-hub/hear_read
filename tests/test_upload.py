import httpx
import os
import asyncio

async def test_upload():
    url = "http://localhost:8000/api/v1/documents/upload"
    
    # Create a dummy text file for testing
    file_name = "test_document.txt"
    with open(file_name, "w") as f:
        f.write("This is a test document for hear_read OCR processing.")

    try:
        async with httpx.AsyncClient() as client:
            with open(file_name, "rb") as f:
                files = {"file": (file_name, f, "text/plain")}
                print(f"Uploading {file_name} to {url}...")
                response = await client.post(url, files=files, timeout=30.0)
            
            if response.status_code == 200:
                print("✅ Upload Successful!")
                print(f"Response: {response.json()}")
            else:
                print(f"❌ Upload Failed with status {response.status_code}")
                print(f"Error: {response.text}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")
    finally:
        # Cleanup
        if os.path.exists(file_name):
            os.remove(file_name)

if __name__ == "__main__":
    asyncio.run(test_upload())
