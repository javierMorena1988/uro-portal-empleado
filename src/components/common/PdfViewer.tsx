import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import './PdfViewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PdfPage {
  pageNumber: number;
  dataUrl: string;
}

interface PdfViewerProps {
  url: string;
  title: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

function getTouchDistance(touches: TouchList) {
  if (touches.length < 2) return 0;
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  );
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url, title }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const zoomRef = useRef(1);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);

  zoomRef.current = zoom;

  const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

  const renderPdf = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPages([]);
    setZoom(1);

    try {
      const width = scrollRef.current?.clientWidth ?? window.innerWidth;
      setContainerWidth(width);

      const pdf = await pdfjs.getDocument(url).promise;
      const renderedPages: PdfPage[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = width / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Canvas no disponible');
        }

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        renderedPages.push({
          pageNumber,
          dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        });
      }

      setPages(renderedPages);
    } catch {
      setError('No se pudo cargar el documento PDF');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    renderPdf();
  }, [renderPdf]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pinchRef.current = {
          distance: getTouchDistance(event.touches),
          zoom: zoomRef.current,
        };
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchRef.current) return;
      event.preventDefault();

      const distance = getTouchDistance(event.touches);
      if (!distance || !pinchRef.current.distance) return;

      const ratio = distance / pinchRef.current.distance;
      const nextZoom = clampZoom(pinchRef.current.zoom * ratio);
      zoomRef.current = nextZoom;
      setZoom(nextZoom);
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        pinchRef.current = null;
      }
    };

    element.addEventListener('touchstart', onTouchStart, { passive: false });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd);
    element.addEventListener('touchcancel', onTouchEnd);

    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  const changeZoom = (delta: number) => {
    setZoom((current) => clampZoom(Number((current + delta).toFixed(2))));
  };

  const resetZoom = () => setZoom(1);

  const pageWidthPx = containerWidth > 0 ? Math.round(containerWidth * zoom) : undefined;

  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer-toolbar" aria-label="Controles de zoom">
        <button
          type="button"
          onClick={() => changeZoom(-ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Alejar"
        >
          −
        </button>
        <button type="button" onClick={resetZoom} className="pdf-viewer-zoom-label">
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={() => changeZoom(ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Acercar"
        >
          +
        </button>
        <span className="pdf-viewer-hint">Pellizca o usa +/−</span>
      </div>

      <div ref={scrollRef} className="pdf-viewer-scroll">
        {loading && <p className="pdf-viewer-status">Cargando documento…</p>}
        {error && <p className="pdf-viewer-status pdf-viewer-status--error">{error}</p>}
        {!loading && !error && (
          <div ref={pagesRef} className="pdf-viewer-pages" aria-label={title}>
            {pages.map((page) => (
              <img
                key={page.pageNumber}
                src={page.dataUrl}
                alt={`${title} — página ${page.pageNumber}`}
                className="pdf-viewer-page"
                style={pageWidthPx ? { width: `${pageWidthPx}px` } : undefined}
                draggable={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
