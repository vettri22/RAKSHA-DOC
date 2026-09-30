import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ArrowLeft, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

GlobalWorkerOptions.workerSrc = pdfWorker;

interface ProtectedPDFPageProps {
  pdfDocument: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
}

const ProtectedPDFPage: React.FC<ProtectedPDFPageProps> = ({ pdfDocument, pageNumber, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cancelRender: (() => void) | undefined;
    setRenderError(null);

    pdfDocument.getPage(pageNumber).then(page => {
      if (cancelled || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) {
        setRenderError('This browser could not render the PDF page.');
        return;
      }

      const viewport = page.getViewport({ scale });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const renderTask = page.render({ canvas, canvasContext: context, viewport });
      cancelRender = () => renderTask.cancel();
      void renderTask.promise.catch(error => {
        if (!cancelled && error?.name !== 'RenderingCancelledException') {
          setRenderError('This PDF page could not be rendered.');
        }
      });
    }).catch(() => {
      if (!cancelled) setRenderError('This PDF page could not be loaded.');
    });

    return () => {
      cancelled = true;
      cancelRender?.();
    };
  }, [pdfDocument, pageNumber, scale]);

  return (
    <div className="flex min-h-40 justify-center">
      {renderError ? (
        <div role="alert" className="p-8 text-sm text-rose-600 dark:text-rose-400">{renderError}</div>
      ) : (
        <canvas ref={canvasRef} aria-label={`PDF page ${pageNumber}`} className="block h-auto max-w-full bg-white shadow-xl" />
      )}
    </div>
  );
};

export const ProtectedDocumentViewer: React.FC = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [concealed, setConcealed] = useState(false);

  useEffect(() => {
    let active = true;
    let loadingTask: ReturnType<typeof getDocument> | undefined;
    setLoading(true);
    setError(null);
    setPdfDocument(null);

    const loadPDF = async () => {
      try {
        const response = await axios.get<ArrayBuffer>(`/api/decryption/watermarked-file/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'arraybuffer'
        });
        if (!active) return;

        loadingTask = getDocument({ data: new Uint8Array(response.data) });
        const loadedDocument = await loadingTask.promise;
        if (active) {
          setPdfDocument(loadedDocument);
          setCurrentPage(1);
        }
      } catch (loadError: any) {
        if (active) {
          setError(loadError.response?.status === 403
            ? 'This account is not authorized to view this document.'
            : 'The protected PDF could not be loaded.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPDF();
    return () => {
      active = false;
      void loadingTask?.destroy();
    };
  }, [sessionId, token]);

  useEffect(() => {
    const preventClipboard = (event: Event) => event.preventDefault();
    const preventShortcuts = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ['c', 'x', 'v', 'p', 's'].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
    };
    const updateVisibility = () => setConcealed(document.visibilityState === 'hidden');
    const concealForPrint = () => setConcealed(true);
    const restoreAfterPrint = () => setConcealed(document.visibilityState === 'hidden');

    document.addEventListener('copy', preventClipboard);
    document.addEventListener('cut', preventClipboard);
    document.addEventListener('paste', preventClipboard);
    document.addEventListener('visibilitychange', updateVisibility);
    window.addEventListener('keydown', preventShortcuts);
    window.addEventListener('beforeprint', concealForPrint);
    window.addEventListener('afterprint', restoreAfterPrint);

    return () => {
      document.removeEventListener('copy', preventClipboard);
      document.removeEventListener('cut', preventClipboard);
      document.removeEventListener('paste', preventClipboard);
      document.removeEventListener('visibilitychange', updateVisibility);
      window.removeEventListener('keydown', preventShortcuts);
      window.removeEventListener('beforeprint', concealForPrint);
      window.removeEventListener('afterprint', restoreAfterPrint);
    };
  }, []);

  const handleContextMenu = (event: React.MouseEvent<HTMLElement>) => event.preventDefault();

  return (
    <section
      className="protected-document-viewer relative space-y-4"
      onContextMenu={handleContextMenu}
      onCopy={event => event.preventDefault()}
      onCut={event => event.preventDefault()}
      onPaste={event => event.preventDefault()}
      onDragStart={handleContextMenu}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/my-documents')}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Assigned documents
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Protected PDF Viewer</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Viewing as {user?.full_name}</p>
          </div>
        </div>

        {pdfDocument && (
          <div className="flex items-center gap-2" aria-label="PDF viewer controls">
            <button
              type="button"
              title="Previous page"
              aria-label="Previous page"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              className="rounded-md border border-slate-300 p-2 text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-20 text-center text-sm tabular-nums text-slate-700 dark:text-slate-200">
              {currentPage} / {pdfDocument.numPages}
            </span>
            <button
              type="button"
              title="Next page"
              aria-label="Next page"
              disabled={currentPage >= pdfDocument.numPages}
              onClick={() => setCurrentPage(page => Math.min(pdfDocument.numPages, page + 1))}
              className="rounded-md border border-slate-300 p-2 text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Zoom out"
              aria-label="Zoom out"
              disabled={scale <= 0.6}
              onClick={() => setScale(value => Math.max(0.6, Number((value - 0.2).toFixed(1))))}
              className="rounded-md border border-slate-300 p-2 text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="min-w-12 text-center text-xs tabular-nums text-slate-500">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              title="Zoom in"
              aria-label="Zoom in"
              disabled={scale >= 2}
              onClick={() => setScale(value => Math.min(2, Number((value + 0.2).toFixed(1))))}
              className="rounded-md border border-slate-300 p-2 text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>

      <div role="note" className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-300">
        Copy, paste, print, and text selection are disabled in this viewer. Operating-system screenshots and screen recording cannot be reliably blocked by a website.
      </div>

      {loading ? (
        <div className="grid min-h-80 place-items-center text-sm text-slate-500">Loading protected document...</div>
      ) : error ? (
        <div role="alert" className="grid min-h-80 place-items-center text-sm text-rose-600 dark:text-rose-400">{error}</div>
      ) : pdfDocument ? (
        <div className="max-h-[calc(100vh-18rem)] overflow-auto rounded-md bg-slate-200 p-3 dark:bg-slate-800 sm:p-6">
          <ProtectedPDFPage pdfDocument={pdfDocument} pageNumber={currentPage} scale={scale} />
        </div>
      ) : null}

      {concealed && (
        <div className="absolute inset-0 z-50 grid place-items-center rounded-md bg-slate-950 text-sm font-semibold text-white">
          Document hidden while the page is in the background
        </div>
      )}
    </section>
  );
};