import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './PDFViewer.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const PDFViewer = ({ fileData }) => {
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.4);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const renderTasksRef = useRef([]);

  // Load from binary data — no file URL needed
  useEffect(() => {
    if (!fileData) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setPdfDoc(null);

    const uint8 = new Uint8Array(fileData);
    const loadingTask = pdfjsLib.getDocument({ data: uint8 });

    loadingTask.promise
      .then((doc) => {
        if (cancelled) { doc.destroy(); return; }
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return; // ignore abort errors from cleanup
        console.error('PDF load error:', err);
        setError(`Failed to load PDF: ${err.message}`);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      loadingTask.destroy().catch(() => {});
    };
  }, [fileData]);

  // Render all pages on doc/scale change
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;

    // Cancel any in-progress renders
    renderTasksRef.current.forEach((t) => { try { t.cancel(); } catch (_) {} });
    renderTasksRef.current = [];

    const container = containerRef.current;
    container.innerHTML = '';

    const renderAllPages = async () => {
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const wrapper = document.createElement('div');
        wrapper.className = 'pdf-page-wrapper';
        wrapper.dataset.page = String(pageNum);

        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.className = 'pdf-canvas';

        const label = document.createElement('div');
        label.className = 'pdf-page-label';
        label.textContent = `Page ${pageNum}`;

        wrapper.appendChild(canvas);
        wrapper.appendChild(label);
        container.appendChild(wrapper);

        const renderTask = page.render({
          canvasContext: canvas.getContext('2d'),
          viewport,
        });
        renderTasksRef.current.push(renderTask);

        try {
          await renderTask.promise;
        } catch (e) {
          if (e?.name !== 'RenderingCancelledException') console.error(e);
        }
      }
    };

    renderAllPages();
  }, [pdfDoc, scale]);

  // Track visible page
  useEffect(() => {
    if (!containerRef.current || numPages === 0) return;

    const stage = containerRef.current.parentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        const topEntry = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (topEntry) setCurrentPage(parseInt(topEntry.target.dataset.page, 10));
      },
      { root: stage, threshold: 0.3 }
    );

    const observe = () => {
      const wrappers = containerRef.current?.querySelectorAll('.pdf-page-wrapper');
      if (wrappers?.length > 0) wrappers.forEach((w) => observer.observe(w));
      else setTimeout(observe, 300);
    };
    observe();

    return () => observer.disconnect();
  }, [numPages, scale]);

  const zoomIn = () => setScale((s) => Math.min(+(s + 0.2).toFixed(1), 3.0));
  const zoomOut = () => setScale((s) => Math.max(+(s - 0.2).toFixed(1), 0.5));

  return (
    <div className="pdf-viewer-root">
      {/* Controls Bar */}
      <div className="pdf-controls-bar">
        <div className="pdf-controls-left">
          <span className="pdf-page-count">
            {numPages > 0 ? `Page ${currentPage} / ${numPages}` : ''}
          </span>
        </div>
        <div className="pdf-controls-center">
          <button className="ctrl-btn" onClick={zoomOut} title="Zoom Out">−</button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button className="ctrl-btn" onClick={zoomIn} title="Zoom In">+</button>
          <div className="ctrl-divider" />
          <button className="ctrl-btn text-btn" onClick={() => setScale(1.4)} title="Fit to Width">Width</button>
          <button className="ctrl-btn text-btn" onClick={() => setScale(1.0)} title="Fit to Page">Page</button>
        </div>
        <div className="pdf-controls-right" />
      </div>

      {/* PDF Stage */}
      <div className="pdf-stage">
        {isLoading && (
          <div className="pdf-state-msg">
            <div className="spinner" />
            <p>Loading PDF…</p>
          </div>
        )}
        {error && (
          <div className="pdf-state-msg error">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}
        {!isLoading && !error && !pdfDoc && (
          <div className="pdf-state-msg">
            <span className="big-icon">📄</span>
            <p>No document loaded</p>
          </div>
        )}
        <div ref={containerRef} className="pdf-pages-container" />
      </div>
    </div>
  );
};

export default PDFViewer;
