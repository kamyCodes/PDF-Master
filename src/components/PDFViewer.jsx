import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './PDFViewer.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const PDFViewer = ({ 
  fileData, 
  scale, 
  setScale, 
  currentPage, 
  setCurrentPage, 
  singlePageMode = false, 
  darkMode = false 
}) => {
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const renderTasksRef = useRef([]);

  // Load from binary data — no file URL needed
  useEffect(() => {
    if (!fileData) {
      setPdfDoc(null);
      setNumPages(0);
      return;
    }

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
        setCurrentPage(1);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('PDF load error:', err);
        setError(`Failed to load PDF: ${err.message}`);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      loadingTask.destroy().catch(() => {});
    };
  }, [fileData]);

  // Render pages based on doc, scale, singlePageMode, and currentPage
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;

    // Cancel any in-progress renders
    renderTasksRef.current.forEach((t) => { try { t.cancel(); } catch (_) {} });
    renderTasksRef.current = [];

    const container = containerRef.current;
    container.innerHTML = '';

    const renderPages = async () => {
      const startPage = singlePageMode ? currentPage : 1;
      const endPage = singlePageMode ? currentPage : pdfDoc.numPages;

      // Bound page range just in case
      const actualStart = Math.max(1, Math.min(startPage, pdfDoc.numPages));
      const actualEnd = Math.max(1, Math.min(endPage, pdfDoc.numPages));

      for (let pageNum = actualStart; pageNum <= actualEnd; pageNum++) {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const wrapper = document.createElement('div');
          wrapper.className = `pdf-page-wrapper ${darkMode ? 'pdf-dark' : ''}`;
          wrapper.dataset.page = String(pageNum);

          const canvas = document.createElement('canvas');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.className = 'pdf-canvas';
          if (darkMode) {
            // High fidelity PDF Inversion filter (retains images nicely using simple invert + rotate)
            canvas.style.filter = 'invert(0.9) hue-rotate(180deg)';
          }

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

          await renderTask.promise;
        } catch (e) {
          if (e?.name !== 'RenderingCancelledException') {
            console.error('Render error page ' + pageNum + ':', e);
          }
        }
      }
    };

    renderPages();
  }, [pdfDoc, scale, singlePageMode, currentPage, darkMode]);

  // Track visible page in continuous mode
  useEffect(() => {
    if (singlePageMode || !containerRef.current || numPages === 0) return;

    const stage = containerRef.current.parentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        const topEntry = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (topEntry) {
          setCurrentPage(parseInt(topEntry.target.dataset.page, 10));
        }
      },
      { root: stage, threshold: 0.2 }
    );

    const observe = () => {
      const wrappers = containerRef.current?.querySelectorAll('.pdf-page-wrapper');
      if (wrappers?.length > 0) wrappers.forEach((w) => observer.observe(w));
      else setTimeout(observe, 300);
    };
    observe();

    return () => observer.disconnect();
  }, [numPages, scale, singlePageMode]);

  const zoomIn = () => setScale((s) => Math.min(+(s + 0.15).toFixed(2), 3.0));
  const zoomOut = () => setScale((s) => Math.max(+(s - 0.15).toFixed(2), 0.5));
  
  const handlePrevPage = () => {
    setCurrentPage((p) => Math.max(p - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(p + 1, numPages));
  };

  return (
    <div className={`pdf-viewer-root ${darkMode ? 'viewer-dark' : ''}`}>
      {/* Controls Bar */}
      <div className="pdf-controls-bar">
        <div className="pdf-controls-left">
          {numPages > 0 && (
            <div className="page-navigator">
              <button 
                className="nav-arrow-btn" 
                onClick={handlePrevPage} 
                disabled={currentPage === 1}
                title="Previous Page"
              >
                ◀
              </button>
              <span className="pdf-page-count">
                Page {currentPage} of {numPages}
              </span>
              <button 
                className="nav-arrow-btn" 
                onClick={handleNextPage} 
                disabled={currentPage === numPages}
                title="Next Page"
              >
                ▶
              </button>
            </div>
          )}
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
            <p>Loading document pages…</p>
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
