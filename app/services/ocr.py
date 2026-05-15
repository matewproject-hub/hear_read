from paddleocr import PaddleOCR
import cv2
import numpy as np
from PIL import Image
from pdf2image import convert_from_path
import os

class OCRService:
    def __init__(self):
        print("Initializing PaddleOCR v4 (High Precision)...")
        # Initialize Paddle for BOTH detection and recognition
        # rec=True enables the full OCR pipeline
        self.detector = PaddleOCR(
            use_angle_cls=True, 
            lang='en', 
            det=True, 
            rec=True, 
            show_log=False,
            use_gpu=False # Set to True if you have a GPU and drivers installed
        )
        print("OCR Service initialized.")
        
    def process_file(self, file_path: str):
        if file_path.lower().endswith(".pdf"):
            return self._process_pdf(file_path)
        else:
            return self._process_image(file_path)

    def _process_image(self, image_path: str, page_num: int = 1):
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not open or find the image: {image_path}")
        return self._process_numpy_image(image, page_num)

    def _process_pdf(self, pdf_path: str):
        print(f"📄 Converting PDF to images: {pdf_path}")
        pages = convert_from_path(pdf_path, dpi=300)
            
        all_blocks = []
        for i, page_image in enumerate(pages):
            print(f"   Processing Page {i+1}/{len(pages)}...")
            open_cv_image = np.array(page_image)
            open_cv_image = cv2.cvtColor(open_cv_image, cv2.COLOR_RGB2BGR)
            
            page_blocks = self._process_numpy_image(open_cv_image, page_num=i+1)
            all_blocks.extend(page_blocks)
            
        return all_blocks

    def _merge_into_paragraphs(self, lines, page_num):
        """
        Groups individual lines into logical paragraphs based on vertical proximity.
        """
        if not lines:
            return []
            
        # Sort lines by their vertical position (Y coordinate)
        # line = [ [[x1,y1],...], (text, confidence) ]
        lines.sort(key=lambda x: x[0][0][1])
        
        paragraphs = []
        if not lines:
            return paragraphs
            
        current_para_text = []
        current_para_coords = None
        last_y_bottom = -1
        
        # Threshold for merging: if vertical distance < 1.5x line height
        # This is a heuristic that works well for standard documents
        for i, line in enumerate(lines):
            coords = line[0]
            text = line[1][0]
            confidence = line[1][1]
            
            y_top = coords[0][1]
            y_bottom = coords[2][1]
            line_height = y_bottom - y_top
            
            # If this is the first line or close to the previous line
            if last_y_bottom == -1 or (y_top - last_y_bottom) < (line_height * 0.8):
                current_para_text.append(text)
                # Update paragraph boundary
                if current_para_coords is None:
                    current_para_coords = coords
                else:
                    # Expand the bounding box
                    current_para_coords[2][1] = y_bottom
                    current_para_coords[3][1] = y_bottom
            else:
                # Save previous paragraph
                paragraphs.append({
                    "content": " ".join(current_para_text),
                    "coordinates": current_para_coords,
                    "sequence_index": len(paragraphs),
                    "page_number": page_num
                })
                # Start new paragraph
                current_para_text = [text]
                current_para_coords = coords
            
            last_y_bottom = y_bottom
            
        # Add the last paragraph
        if current_para_text:
            paragraphs.append({
                "content": " ".join(current_para_text),
                "coordinates": current_para_coords,
                "sequence_index": len(paragraphs),
                "page_number": page_num
            })
            
        return paragraphs

    def _process_numpy_image(self, image, page_num: int):
        # Run full OCR (Detection + Recognition)
        result = self.detector.ocr(image, cls=True)
        
        if not result or not result[0]:
            return []
            
        # Extract lines
        lines = result[0]
        
        # Merge lines into paragraphs
        paragraphs = self._merge_into_paragraphs(lines, page_num)
        
        return paragraphs