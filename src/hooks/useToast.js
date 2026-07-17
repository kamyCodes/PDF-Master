import { useState, useCallback } from 'react';

let _nextId = 1;

/**
 * useToast — returns { toasts, toast } 
 *
 * toast(options) options:
 *   type    : 'success' | 'error' | 'warning' | 'info' | 'loading'  (default 'info')
 *   title   : string  (short headline)
 *   message : string  (detail body)
 *   duration: number  ms before auto-dismiss (default 5000; 0 = no auto-dismiss)
 *
 * Returns the toast id so the caller can dismiss it early:
 *   const id = toast({ type: 'loading', title: 'Working…', duration: 0 });
 *   …later…
 *   dismiss(id);
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options) => {
    const id = `toast_${_nextId++}`;
    const entry = { id, type: 'info', duration: 5000, ...options };
    setToasts((prev) => [...prev, entry]);
    return id;
  }, []);

  // Convenience wrappers
  const success  = useCallback((title, message, duration) => toast({ type: 'success',  title, message, duration }),           [toast]);
  const error    = useCallback((title, message, duration) => toast({ type: 'error',    title, message, duration: duration ?? 8000 }), [toast]);
  const warning  = useCallback((title, message, duration) => toast({ type: 'warning',  title, message, duration }),           [toast]);
  const info     = useCallback((title, message, duration) => toast({ type: 'info',     title, message, duration }),           [toast]);
  const loading  = useCallback((title, message)          => toast({ type: 'loading',  title, message, duration: 0 }),         [toast]);

  return { toasts, dismiss, toast, success, error, warning, info, loading };
}
