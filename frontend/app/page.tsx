
'use client';

import { useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Download,
  X,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const API =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Status = 'idle' | 'ready' | 'converting' | 'done' | 'error';

export default function Home() {
  const input = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const pick = (f?: File) => {
    if (!f) return;

    setError('');
    setDownloadUrl(null);

    if (
      f.type !== 'application/pdf' &&
      !f.name.toLowerCase().endsWith('.pdf')
    ) {
      setError('Please choose a PDF file.');
      return;
    }

    setFile(f);
    setStatus('ready');
  };

  const convert = async () => {
    if (!file) return;

    setStatus('converting');
    setError('');
    setDownloadUrl(null);

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch(`${API}/api/convert`, {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || 'Conversion failed.');
      }

      const blob = await res.blob();

      // File ready hai, lekin automatically download nahi hogi.
      const url = URL.createObjectURL(blob);

      setDownloadUrl(url);
      setStatus('done');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Something went wrong.'
      );

      setStatus('error');
    }
  };

  const reset = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }

    setFile(null);
    setStatus('idle');
    setError('');
    setDownloadUrl(null);

    if (input.current) {
      input.current.value = '';
    }
  };

  return (
    <main>
      <nav>
        <div className="brand">
          <span className="logo">W</span> PDF<span>2</span>Word
        </div>

        <div className="navnote">
          No sign-up · Fast conversion
        </div>
      </nav>

      <section className="hero">
        <div className="pill">
          ✦ Simple PDF to Word conversion
        </div>

        <h1>
          Turn PDFs into <em>editable Word</em> files.
          <h1>Powered by OCR</h1>
        </h1>

        <p className="sub">
          Upload a PDF, convert it in seconds, and download your
          .docx. No account required.
        </p>

        <div
          className="card"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files[0]);
          }}
        >
          {status === 'idle' && (
            <>
              <div className="uploadIcon">
                <Upload />
              </div>

              <h2>Drop your PDF here</h2>

              <p>or</p>

              <button
                className="primary"
                onClick={() => input.current?.click()}
              >
                Choose PDF
              </button>

              <input
                ref={input}
                hidden
                type="file"
                accept="application/pdf"
                onChange={(e) =>
                  pick(e.target.files?.[0])
                }
              />

              <small>PDF files · up to 100 MB</small>
            </>
          )}

          {file && status !== 'idle' && (
            <div className="selected">
              <div className="fileRow">
                <div className="pdfIcon">
                  <FileText />
                </div>

                <div className="fileInfo">
                  <strong>{file.name}</strong>

                  <span>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>

                {status !== 'converting' && (
                  <button
                    className="iconBtn"
                    onClick={reset}
                  >
                    <X />
                  </button>
                )}
              </div>

              {status === 'ready' && (
                <button
                  className="primary wide"
                  onClick={convert}
                >
                  Convert to Word
                  <Download />
                </button>
              )}

              {status === 'converting' && (
                <div className="progressBox">
                  <Loader2 className="spin" />

                  <div>
                    <strong>
                      Converting your PDF…
                    </strong>

                    <span>
                      Extracting text and preserving layout
                    </span>
                  </div>
                </div>
              )}

              {status === 'done' && (
                <div className="success">
                  <CheckCircle2 />

                  <div>
                    <strong>
                      Conversion complete
                    </strong>

                    <span>
                      Your Word file is ready to download.
                    </span>
                  </div>

                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      download={file.name.replace(
                        /\.pdf$/i,
                        '.docx'
                      )}
                      className="downloadBtn"
                    >
                      <Download />
                      Download Word
                    </a>
                  )}

                  <button onClick={reset}>
                    Convert another
                  </button>
                </div>
              )}

              {error && (
                <div className="error">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="trust">
          <div>
            <Zap />
            Fast processing
          </div>

          <div>
            <ShieldCheck />
            Files auto-deleted
          </div>

          <div>
            <CheckCircle2 />
            No account
          </div>
        </div>
      </section>

      <footer>
        PDF2Word · Your files are processed temporarily and
        removed after conversion.
      </footer>
    </main>
  );
}

