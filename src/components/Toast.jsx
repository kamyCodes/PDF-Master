import React, { useEffect, useRef } from 'react';
import './Toast.css';

/**
 * Single toast entry rendered by the ToastContainer.
 * props: { id, type, title, message, duration, onDismiss }
 */
export const Toast = ({ id, type = 'info', title, message, duration = 5000, onDismiss }) => {
  const progressRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Animate the progress bar
    if (progressRef.current) {
      progressRef.current.style.transition = `width ${duration}ms linear`;
      requestAnimationFrame(() => {
        if (progressRef.current) progressRef.current.style.width = '0%';
      });
    }
    timerRef.current = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timerRef.current);
  }, []);

  const icons = {
    success: '✓',
    error:   '✕',
    warning: '⚠',
    info:    'ℹ',
    loading: '⟳',
  };

  return (
    <div className={`toast toast-${type}`} role="alert">
      <div className="toast-icon">{icons[type] ?? 'ℹ'}</div>
      <div className="toast-body">
        {title && <div className="toast-title">{title}</div>}
        {message && <div className="toast-message">{message}</div>}
      </div>
      <button className="toast-close" onClick={() => onDismiss(id)} aria-label="Dismiss">✕</button>
      <div className="toast-progress" ref={progressRef} />
    </div>
  );
};

/**
 * Container that holds the toast stack.
 * props: { toasts, onDismiss }
 */
export const ToastContainer = ({ toasts, onDismiss }) => (
  <div className="toast-container" aria-live="polite">
    {toasts.map((t) => (
      <Toast key={t.id} {...t} onDismiss={onDismiss} />
    ))}
  </div>
);
