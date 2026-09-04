import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware

import fitz
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pdf2docx import Converter

APP_NAME = "PDF to Word"
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE_MB", "100")) * 1024 * 1024

app = FastAPI(title=APP_NAME, version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

BASE = Path(tempfile.gettempdir()) / "pdf2word"
BASE.mkdir(parents=True, exist_ok=True)


def is_pdf(path: Path) -> bool:
    with path.open("rb") as f:
        return f.read(5) == b"%PDF-"


def needs_ocr(path: Path) -> bool:
    doc = fitz.open(path)
    try:
        pages = min(len(doc), 5)
        if pages == 0:
            return True
        text_chars = sum(len(doc[i].get_text("text").strip()) for i in range(pages))
        return text_chars < 20
    finally:
        doc.close()


def run_ocr(src: Path, dst: Path) -> None:
    cmd = [
        "ocrmypdf",
        "--skip-text",
        "--deskew",
        "--clean",
        "--optimize", "1",
        str(src), str(dst),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-2000:] or "OCR failed")


def pdf_to_docx(pdf_path: Path, docx_path: Path) -> None:
    converter = Converter(str(pdf_path))
    try:
        converter.convert(str(docx_path), start=0, end=None)
    finally:
        converter.close()


@app.get("/health")
def health():
    return {"ok": True, "service": APP_NAME}


@app.post("/api/convert")
async def convert_pdf(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "Please select a PDF file.")
    if file.content_type not in ("application/pdf", "application/octet-stream") and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")

    job = BASE / str(uuid.uuid4())
    job.mkdir(parents=True, exist_ok=True)
    src = job / "input.pdf"
    ocr_pdf = job / "ocr.pdf"
    out = job / "converted.docx"

    try:
        size = 0
        with src.open("wb") as buffer:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_FILE_SIZE:
                    raise HTTPException(413, f"File is too large. Maximum is {MAX_FILE_SIZE // (1024*1024)} MB.")
                buffer.write(chunk)

        if not is_pdf(src):
            raise HTTPException(400, "The uploaded file is not a valid PDF.")

        working_pdf = src
        if needs_ocr(src):
            run_ocr(src, ocr_pdf)
            working_pdf = ocr_pdf

        pdf_to_docx(working_pdf, out)
        if not out.exists() or out.stat().st_size == 0:
            raise RuntimeError("Conversion produced an empty document.")

        download_name = Path(file.filename).stem + ".docx"
        return FileResponse(
            out,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=download_name,
            background=None,
        )
    except HTTPException:
        raise
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "OCR took too long. Please try a smaller PDF.")
    except Exception as exc:
        raise HTTPException(500, f"Conversion failed: {str(exc)[:300]}")
    finally:
        # FileResponse may need the file after return, so cleanup is handled by a small delayed process.
        if out.exists():
            subprocess.Popen(["sh", "-c", f"sleep 30; rm -rf {job!s}"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            shutil.rmtree(job, ignore_errors=True)
