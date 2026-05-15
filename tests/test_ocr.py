import sys
import os
import json
sys.path.append(os.getcwd())

from app.services.ocr import OCRService

def run_test():
    # 1. Initialize Service
    ocr = OCRService()
    
    # 2. Find a test image (Change this to a path of an image you have)
    test_image = "test_sample.png" 
    
    # If no test image exists, we'll tell the user
    if not os.path.exists(test_image):
        print(f"⚠️ Please place an image named '{test_image}' in the root folder to test.")
        return

    print(f"Processing {test_image}...")
    
    # 3. Run OCR
    try:
        results = ocr.process_image(test_image)
        
        print("\n--- Extracted Text Blocks ---")
        for block in results:
            print(f"[{block['sequence_index']}] Text: {block['content']}")
        
        # Save results to a file for inspection
        with open("ocr_results.json", "w") as f:
            json.dump(results, f, indent=4)
        print("\n✅ Full results saved to ocr_results.json")
        
    except Exception as e:
        print(f"❌ OCR processing failed: {e}")

if __name__ == "__main__":
    run_test()