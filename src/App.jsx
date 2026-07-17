import React, { useState } from 'react';
import Ribbon from './components/Ribbon';
import PDFViewer from './components/PDFViewer';
import './App.css';

function App() {
  const [currentFile, setCurrentFile] = useState(null); // { path, data }
  const [statusMsg, setStatusMsg] = useState('');

  const showStatus = (msg, isError = false) => {
    setStatusMsg({ text: msg, error: isError });
    setTimeout(() => setStatusMsg(''), 5000);
  };

  const handleOpenFile = async () => {
    if (!window.electronAPI) return console.warn('Electron API unavailable');
    const result = await window.electronAPI.openFile();
    if (result?.data) {
      setCurrentFile(result);
      showStatus(`Opened: ${result.path.split('\\').pop()}`);
    } else if (result?.error) {
      showStatus('Error reading file: ' + result.error, true);
    }
  };

  const handleAction = async (actionName) => {
    const api = window.electronAPI;
    if (!api) return;

    // ── Actions that don't need an open file ──────────────────────
    if (actionName === 'merge') {
      const paths = await api.openFiles();
      if (!paths || paths.length < 2) {
        showStatus('Select at least 2 PDFs to merge.', true);
        return;
      }
      const savePath = await api.saveFile('merged.pdf');
      if (!savePath) return;

      showStatus('Merging PDFs…');
      const args = ['--input', ...paths, '--output', savePath];
      const result = await api.runPython('merge', args);
      if (result.status === 'success') {
        showStatus('✓ Merged! Saved to: ' + savePath.split('\\').pop());
        // Load the merged file immediately in the viewer
        const loaded = await api.readFile(savePath);
        if (loaded && !loaded.error) {
          setCurrentFile(loaded);
        } else if (loaded?.error) {
          showStatus('Failed to load merged file: ' + loaded.error, true);
        }
      } else {
        showStatus('Merge error: ' + result.message, true);
      }
      return;
    }

    // ── Actions that need a currently open file ───────────────────
    if (!currentFile) {
      showStatus('Open a PDF first.', true);
      return;
    }

    const filePath = currentFile.path;
    const fileBaseName = filePath.split('\\').pop().replace('.pdf', '');
    const outputDir = filePath.substring(0, filePath.lastIndexOf('\\'));

    if (actionName === 'split') {
      showStatus('Splitting PDF…');
      const result = await api.runPython('split', ['--input', filePath, '--output', outputDir]);
      if (result.status === 'success') {
        showStatus('✓ ' + result.message);
      } else {
        showStatus('Split error: ' + result.message, true);
      }

    } else if (actionName === 'highlight') {
      const text = prompt('Enter the exact text to highlight (case-sensitive):');
      if (!text) return;
      const savePath = await api.saveFile(`${fileBaseName}_highlighted.pdf`);
      if (!savePath) return;
      showStatus('Highlighting…');
      const result = await api.runPython('highlight', ['--input', filePath, '--output', savePath, '--text', text]);
      if (result.status === 'success') {
        showStatus('✓ Highlighted and saved to: ' + savePath.split('\\').pop());
        // Load the highlighted file immediately in the viewer
        const loaded = await api.readFile(savePath);
        if (loaded && !loaded.error) {
          setCurrentFile(loaded);
        } else if (loaded?.error) {
          showStatus('Failed to load highlighted file: ' + loaded.error, true);
        }
      } else {
        showStatus('Highlight error: ' + result.message, true);
      }

    } else if (actionName === 'replace') {
      const oldText = prompt('Exact text to find (case-sensitive):');
      if (!oldText) return;
      const newText = prompt('Replace with:');
      if (newText === null) return;
      const savePath = await api.saveFile(`${fileBaseName}_edited.pdf`);
      if (!savePath) return;
      showStatus('Replacing text…');
      const result = await api.runPython('replace', ['--input', filePath, '--output', savePath, '--text', oldText, '--new_text', newText]);
      if (result.status === 'success') {
        showStatus('✓ ' + result.message);
        // Load the edited file immediately in the viewer
        const loaded = await api.readFile(savePath);
        if (loaded && !loaded.error) {
          setCurrentFile(loaded);
        } else if (loaded?.error) {
          showStatus('Failed to load edited file: ' + loaded.error, true);
        }
      } else {
        showStatus('Replace error: ' + result.message, true);
      }

    } else if (actionName === 'save') {
      showStatus('Saving…');
      const result = await api.runPython('save', ['--input', filePath, '--output', filePath]);
      if (result.status === 'success') {
        showStatus('✓ Saved!');
      } else {
        showStatus('Save error: ' + result.message, true);
      }

    } else if (actionName === 'save-as') {
      const savePath = await api.saveFile(`${fileBaseName}_copy.pdf`);
      if (!savePath) return;
      const result = await api.runPython('save', ['--input', filePath, '--output', savePath]);
      if (result.status === 'success') {
        showStatus('✓ Saved as: ' + savePath.split('\\').pop());
        // Switch to the newly saved-as file
        const loaded = await api.readFile(savePath);
        if (loaded && !loaded.error) {
          setCurrentFile(loaded);
        }
      } else {
        showStatus('Save As error: ' + result.message, true);
      }

    } else {
      showStatus(`"${actionName}" is coming soon!`);
    }
  };

  return (
    <div className="app-container">
      <Ribbon onOpenFile={handleOpenFile} onAction={handleAction} />

      {/* Status Bar */}
      {statusMsg && (
        <div className={`status-bar ${statusMsg.error ? 'error' : 'success'}`}>
          {statusMsg.text}
        </div>
      )}

      <div className="main-stage">
        {currentFile ? (
          <PDFViewer fileData={currentFile.data} />
        ) : (
          <div className="pdf-viewer-placeholder">
            <div className="placeholder-content">
              <span className="icon">📄</span>
              <h2>No Document Open</h2>
              <p>Home → Open PDF to load a document</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
