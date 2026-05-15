# 🎧 HearRead AI
**Transform your browser into a high-performance, AI-powered document reader.**

HearRead AI is a state-of-the-art browser extension and backend ecosystem that enables real-time text extraction and speech synthesis from any webpage, PDF, or image. Powered by **PaddleOCR v4** and **Kokoro-ONNX**, it offers natural-sounding voices and a seamless interactive reading experience.

---

## 🚀 Key Features
*   **Interactive Selection Reader:** Highlight any text on a webpage (or press `Ctrl+A`) and hear it read aloud instantly.
*   **Full Screen OCR:** Scans the entire viewport to extract structured text blocks, even from images and complex layouts.
*   **Synchronized Highlighting:** Real-time visual feedback that follows the reading progress block-by-block.
*   **Glassmorphism Floating Player:** A modern, non-intrusive UI that stays on top of your content.
*   **Multi-Format Support:** Handles standard HTML, scanned Images, and multi-page PDFs.

---

## 🛠 Technology Stack
*   **Backend:** FastAPI (Python 3.10+)
*   **OCR Engine:** PaddleOCR v4 (Detection + Recognition)
*   **TTS Engine:** Kokoro-ONNX (Low-latency streaming)
*   **Database/Storage:** SQLAlchemy + Supabase
*   **Frontend:** Chrome Extension (Manifest V3) with Shadow DOM isolation.

---

## 📦 Installation

### 1. Backend Setup
```bash
# Clone the repository
git clone https://github.com/matewproject-hub/hear_read.git
cd hear_read

# Install system dependencies (Linux)
sudo apt-get install poppler-utils

# Install Python packages
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2. Browser Extension Setup
1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** (toggle in the top right).
3.  Click **Load unpacked**.
4.  Select the `extension/` folder from this repository.

---

## 📖 Usage
1.  Navigate to any website or open a PDF in your browser.
2.  Click the **HearRead AI** icon in your toolbar and select **SCAN SCREEN**.
3.  **To read specific parts:** Highlight text with your mouse and click **🔊 READ SELECTION** on the floating bar.
4.  **To read everything:** Press `Ctrl+A` and click **🔊 READ SELECTION**.

---

## 🏗 Architecture
*   **`app/`**: Core FastAPI backend logic.
*   **`extension/`**: Browser extension files (JS, CSS, HTML).
*   **`services/`**: AI model wrappers for OCR and TTS.
*   **`offscreen/`**: Dedicated audio bridge for background playback in Manifest V3.

---

## 🛡 License
MIT License. Free for personal and commercial use.

---
*Built with ❤️ by the HearRead AI Team.*
