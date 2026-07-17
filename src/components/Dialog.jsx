import React, { useState, useEffect, useRef } from 'react';
import './Dialog.css';

export const Dialog = ({ state }) => {
  if (!state) return null;

  const { type, title, message, placeholder, onConfirm, onCancel } = state;
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (type === 'prompt' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [type]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (type === 'prompt') {
      onConfirm(inputValue);
    } else {
      onConfirm();
    }
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-content">
        <h3 className="dialog-title">{title}</h3>
        {message && <p className="dialog-message">{message}</p>}
        
        {type === 'prompt' && (
          <form onSubmit={handleSubmit} className="dialog-form">
            <input 
              ref={inputRef}
              type="text" 
              className="dialog-input"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder={placeholder || 'Type here...'}
            />
          </form>
        )}

        <div className="dialog-actions">
          {type !== 'alert' && (
            <button type="button" className="dialog-btn cancel" onClick={onCancel}>Cancel</button>
          )}
          <button type="button" className="dialog-btn confirm" onClick={handleSubmit}>
            {type === 'alert' ? 'OK' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
