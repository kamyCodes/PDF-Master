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
  darkMode = false,
  onDocumentLoad,
}) => {
  const containerRef  = useRef(null);
  const stageRef      = useRef(null);      // scrollable stage ref
  const [pdfDoc,    setPdfDoc]    = useState(null);
  const [numPages,  setNumPages]  = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState(null);

  // Render-task handles so we can cancel in-flight renders
  const renderTasksRef = useRef([]);

  // Previous-value refs — used to detect what actually changed
  const prevCurrentPage    = useRef(currentPage);
  const prevSinglePageMode = useRef(singlePageMode);
  const prevPdfDoc         = useRef(pdfDoc);
  const prevScale          = useRef(scale);
  const prevDarkMode       = useRef(darkMode);

  // ─────────────────────────────────────────────────────────────────
  // 1.  Load PDF from binary buffer
  // ─────────────────────────────────────────────────────────────────
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

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(fileData) });

    loadingTask.promise
      .then((doc) => {
        if (cancelled) { doc.destroy(); return; }
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setIsLoading(false);
        setCurrentPage(1);
        if (onDocumentLoad) onDocumentLoad(doc.numPages);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(`Failed to load PDF: ${err.message}`);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      loadingTask.destroy().catch(() => {});
    };
  }, [fileData]);

  // ─────────────────────────────────────────────────────────────────
  // 2.  Render / scroll on state changes
  //     KEY RULE:
  //       • In CONTINUOUS mode, if only currentPage changed → SCROLL, don't re-render.
  //       • Everything else → full re-render, then scroll to currentPage.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;

    const pageChanged    = prevCurrentPage.current    !== currentPage;
    const modeChanged    = prevSinglePageMode.current !== singlePageMode;
    const docChanged     = prevPdfDoc.current         !== pdfDoc;
    const scaleChanged   = prevScale.current          !== scale;
    const darkChanged    = prevDarkMode.current       !== darkMode;

    // Update refs BEFORE any early return so next call has correct previous values
    prevCurrentPage.current    = currentPage;
    prevSinglePageMode.current = singlePageMode;
    prevPdfDoc.current         = pdfDoc;
    prevScale.current          = scale;
    prevDarkMode.current       = darkMode;

    // ── Continuous-mode navigation: just scroll ───────────────────
    const onlyPageChangedContinuous =
      !singlePageMode &&
      !modeChanged && !docChanged && !scaleChanged && !darkChanged &&
      pageChanged;

    if (onlyPageChangedContinuous) {
      scrollToPage(currentPage);
      return;
    }

    // ── Full re-render ────────────────────────────────────────────
    renderTasksRef.current.forEach((t) => { try { t.cancel(); } catch (_) {} });
    renderTasksRef.current = [];
    containerRef.current.innerHTML = '';

    const startPage = singlePageMode ? currentPage : 1;
    const endPage   = singlePageMode ? currentPage : pdfDoc.numPages;

    const doRender = async () => {
      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        try {
          const page     = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale });

          const wrapper = document.createElement('div');
          wrapper.className = `pdf-page-wrapper${darkMode ? ' pdf-dark' : ''}`;
          wrapper.dataset.page = String(pageNum);

          const canvas = document.createElement('canvas');
          canvas.width  = viewport.width;
          canvas.height = viewport.height;
          canvas.className = 'pdf-canvas';
          if (darkMode) canvas.style.filter = 'invert(0.9) hue-rotate(180deg)';

          const label = document.createElement('div');
          label.className   = 'pdf-page-label';
          label.textContent = `Page ${pageNum}`;

          wrapper.appendChild(canvas);
          wrapper.appendChild(label);
          containerRef.current.appendChild(wrapper);

          const renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport });
          renderTasksRef.current.push(renderTask);
          await renderTask.promise;
        } catch (e) {
          if (e?.name !== 'RenderingCancelledException') console.error(e);
        }
      }

      // After a full re-render of continuous mode scroll to the desired page
      if (!singlePageMode && currentPage > 1) {
        // Give the browser one frame to layout the canvases before scrolling
        requestAnimationFrame(() => scrollToPage(currentPage));
      }
    };

    doRender();
  }, [pdfDoc, scale, singlePageMode, darkMode, currentPage]);

  // ─────────────────────────────────────────────────────────────────
  // 3.  Track visible page while user scrolls (continuous mode only)
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (singlePageMode || !stageRef.current || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top) {
          const pg = parseInt(top.target.dataset.page, 10);
          // Only update if we have a valid page and it actually changed
          if (!isNaN(pg) && pg !== prevCurrentPage.current) {
            setCurrentPage(pg);
          }
        }
      },
      { root: stageRef.current, threshold: 0.3 }
    );

    const observe = () => {
      if (!containerRef.current) return;
      const wrappers = containerRef.current.querySelectorAll('.pdf-page-wrapper');
      if (wrappers.length > 0) wrappers.forEach((w) => observer.observe(w));
      else setTimeout(observe, 300);
    };
    observe();

    return () => observer.disconnect();
  }, [numPages, scale, singlePageMode]);

  // ─────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────
  const scrollToPage = (page) => {
    if (!containerRef.current) return;
    const wrapper = containerRef.current.querySelector(`.pdf-page-wrapper[data-page="${page}"]`);
    if (wrapper) {
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const zoomIn  = () => setScale((s) => Math.min(+(s + 0.15).toFixed(2), 3.0));
  const zoomOut = () => setScale((s) => Math.max(+(s - 0.15).toFixed(2), 0.5));

  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(p + 1, numPages));

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className={`pdf-viewer-root${darkMode ? ' viewer-dark' : ''}`}>
      {/* Controls Bar */}
      <div className="pdf-controls-bar">
        <div className="pdf-controls-left">
          {numPages > 0 && (
            <div className="page-navigator">
              <button
                className="nav-arrow-btn"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                title="Previous Page"
              >◀</button>
              <span className="pdf-page-count">
                Page {currentPage} of {numPages}
              </span>
              <button
                className="nav-arrow-btn"
                onClick={handleNextPage}
                disabled={currentPage >= numPages}
                title="Next Page"
              >▶</button>
            </div>
          )}
        </div>

        <div className="pdf-controls-center">
          <button className="ctrl-btn" onClick={zoomOut} title="Zoom Out">−</button>
          <span className="zoom-level">{Math.round(scale * 100)}%</span>
          <button className="ctrl-btn" onClick={zoomIn}  title="Zoom In">+</button>
          <div className="ctrl-divider" />
          <button className="ctrl-btn text-btn" onClick={() => setScale(1.4)} title="Fit to Width">Width</button>
          <button className="ctrl-btn text-btn" onClick={() => setScale(1.0)} title="Fit to Page">Page</button>
        </div>

        <div className="pdf-controls-right" />
      </div>

      {/* PDF Stage */}
      <div className="pdf-stage" ref={stageRef}>
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
