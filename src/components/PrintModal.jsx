import React, { useState, useEffect } from 'react';
import './PrintModal.css';

export function PrintModal({ activeFile, onClose, onPrint }) {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [copies, setCopies] = useState(1);
  const [color, setColor] = useState(true);
  const [landscape, setLandscape] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    async function fetchPrinters() {
      const api = window.electronAPI;
      if (api && api.getPrinters) {
        const p = await api.getPrinters();
        setPrinters(p);
        const defaultPrinter = p.find((x) => x.isDefault);
        if (defaultPrinter) setSelectedPrinter(defaultPrinter.name);
        else if (p.length > 0) setSelectedPrinter(p[0].name);
      }
    }
    fetchPrinters();
  }, []);

  const handlePrint = async () => {
    setIsPrinting(true);
    await onPrint({
      deviceName: selectedPrinter,
      copies: parseInt(copies, 10),
      color,
      landscape,
    });
    setIsPrinting(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="print-modal-content">
        <h2>Print Document</h2>
        <p className="print-modal-subtitle">{activeFile?.name || 'Unknown Document'}</p>
        
        <div className="print-form">
          <div className="form-group">
            <label>Printer</label>
            <select value={selectedPrinter} onChange={(e) => setSelectedPrinter(e.target.value)}>
              {printers.map((p) => (
                <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
              ))}
              {printers.length === 0 && <option value="">No printers found</option>}
            </select>
          </div>
          
          <div className="form-group row">
            <div className="form-group-half">
              <label>Copies</label>
              <input type="number" min="1" max="100" value={copies} onChange={(e) => setCopies(e.target.value)} />
            </div>
            <div className="form-group-half">
              <label>Color Mode</label>
              <select value={color ? 'color' : 'bw'} onChange={(e) => setColor(e.target.value === 'color')}>
                <option value="color">Color</option>
                <option value="bw">Black & White</option>
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label>Orientation</label>
            <select value={landscape ? 'landscape' : 'portrait'} onChange={(e) => setLandscape(e.target.value === 'landscape')}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose} disabled={isPrinting}>Cancel</button>
          <button className="btn-primary" onClick={handlePrint} disabled={!selectedPrinter || isPrinting}>
            {isPrinting ? 'Printing...' : 'Print'}
          </button>
        </div>
      </div>
    </div>
  );
}
