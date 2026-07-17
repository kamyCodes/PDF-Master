import { useState, useCallback } from 'react';

export function useDialog() {
  const [dialogState, setDialogState] = useState(null);

  const showDialog = useCallback((options) => {
    return new Promise((resolve) => {
      setDialogState({
        ...options,
        onConfirm: (val) => {
          setDialogState(null);
          resolve(val !== undefined ? val : true);
        },
        onCancel: () => {
          setDialogState(null);
          resolve(null);
        }
      });
    });
  }, []);

  const prompt = useCallback((title, message, placeholder = '') => {
    return showDialog({ type: 'prompt', title, message, placeholder });
  }, [showDialog]);

  const confirm = useCallback((title, message) => {
    return showDialog({ type: 'confirm', title, message });
  }, [showDialog]);

  const alert = useCallback((title, message) => {
    return showDialog({ type: 'alert', title, message });
  }, [showDialog]);

  return { dialogState, prompt, confirm, alert };
}
