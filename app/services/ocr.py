from networkx.generators import spectral_graph_forge
import copy
import cv2
import numpy as np
from PIL import Image
from pdf2image import convert_from_path
from paddleocr import PaddleOCR


class OCRService:
    def __init__(self):
        print("Initializing PaddleOCR v4 (High Precision)...")
        self.detector = PaddleOCR(
            use_angle_cls=True,
            lang="en",
            det=True,
            rec=True,
            show_log=False,
            use_gpu=False,  # Set to True if you have a GPU
        )
        print("OCR Service initialized.")

    # ──────────────────────────────────────────────────────────
    # Public entry point
    # ──────────────────────────────────────────────────────────

    def process_file(self, file_path: str):
        if file_path.lower().endswith(".pdf"):
            return self._process_pdf(file_path)
        return self._process_image(file_path)

    # ──────────────────────────────────────────────────────────
    # Image / PDF helpers
    # ──────────────────────────────────────────────────────────

    def _process_image(self, image_path: str, page_num: int = 1):
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not open or find the image: {image_path}")
        return self._process_numpy_image(image, page_num)

    def _process_pdf(self, pdf_path: str):
        print(f"Converting PDF to images: {pdf_path}")
        pages = convert_from_path(pdf_path, dpi=300)

        all_blocks = []
        for i, page_image in enumerate(pages):
            print(f"   Processing page {i + 1}/{len(pages)}...")
            width, height = page_image.size
            open_cv_image = cv2.cvtColor(np.array(page_image), cv2.COLOR_RGB2BGR)

            page_blocks = self._process_numpy_image(open_cv_image, page_num=i + 1)
            for block in page_blocks:
                block["page_width"] = width
                block["page_height"] = height

            all_blocks.extend(page_blocks)

        return all_blocks

    # ──────────────────────────────────────────────────────────
    # Core OCR + paragraph assembly
    # ──────────────────────────────────────────────────────────

    def _process_numpy_image(self, image, page_num: int):

        result = self.detector.ocr(image, cls=True)

        if not result or not result[0]:
            return []

        lines = result[0]

        blocks = []

        height, width = image.shape[:2]

        for sequence_index, line in enumerate(lines):

            try:

                coords = line[0]

                text = line[1][0]

                confidence = float(line[1][1])

                if not text.strip():
                    continue

                # Normalize coordinates (0 → 1)

                normalized_box = []

                for point in coords:

                    x = point[0] / width
                    y = point[1] / height

                    normalized_box.append([x, y])

                blocks.append({

                    "content": text,

                    "coordinates": normalized_box,

                    "confidence": confidence,

                    "page": page_num,

                    "sequence_index": sequence_index
                })

            except Exception as e:

                print("OCR parse error:", e)

                continue

            blocks.sort(
                key=lambda b:(
                    b["page"],
                    b["sequence_index"]
                )
            )

        return blocks

    