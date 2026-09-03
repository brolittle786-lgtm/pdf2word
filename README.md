# PDF2Word SaaS

No-login PDF → DOCX web app with text-PDF conversion and automatic OCR for scanned PDFs.

## Fastest local setup (Docker)
1. Install Docker + Compose.
2. From this folder run: `docker compose up --build`
3. Open `http://localhost:3000`
4. Backend health: `http://localhost:8000/health`

## Notes
- No application account/login system.
- No daily usage quota.
- Practical per-file infrastructure cap is configurable with `MAX_FILE_SIZE_MB` (default 100MB).
- Uploaded files are temporary and scheduled for deletion after download.
- OCR uses Tesseract/OCRmyPDF when the PDF has little/no extractable text.
