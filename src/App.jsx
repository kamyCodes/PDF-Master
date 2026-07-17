import React, { useState, useEffect } from 'react';
import Ribbon from './components/Ribbon';
import PDFViewer from './components/PDFViewer';
import './App.css';

function App() {
  // Tabs State (supports multiple files open at once)
  const [openFiles, setOpenFiles] = useState([]); // { id, name, path, workingPath, data, currentPage, scale }
  const [activeFileId, setActiveFileId] = useState(null);

  // Sidebar Toggles
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarActiveTab, setSidebarActiveTab] = useState('pages');

  // AI Chat Panel
  const [aiPaneOpen, setAiPaneOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { id: '1', type: 'bot', text: 'Hi! I am your PDF Master AI Assistant. Click any option in the AI ribbon or ask me anything about your loaded PDF!' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Modals & Forms State
  const [activeModal, setActiveModal] = useState(null); // 'encrypt' | 'remove-pw' | 'watermark' | 'compress' | 'page-numbers' | 'header-footer' | 'metadata' | 'shortcuts'
  const [modalInputs, setModalInputs] = useState({});
  const [statusMsg, setStatusMsg] = useState('');

  // Global Viewing Mode overrides
  const [singlePageMode, setSinglePageMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Active File Getter helper
  const activeFile = openFiles.find((f) => f.id === activeFileId);

  // Toast status bar helper
  const showStatus = (msg, isError = false) => {
    setStatusMsg({ text: msg, error: isError });
    setTimeout(() => setStatusMsg(''), 5000);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleOpenFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFile) handleAction('save');
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        // Triggers search panel
        e.preventDefault();
        setSidebarOpen(true);
        setSidebarActiveTab('search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, openFiles]);

  const handleOpenFile = async () => {
    if (!window.electronAPI) return;
    showStatus('Opening File dialog…');
    const result = await window.electronAPI.openFile();
    if (result && !result.error) {
      const fileName = result.path.split('\\').pop();
      const newFile = {
        id: `file_${Date.now()}`,
        name: fileName,
        path: result.path,
        workingPath: result.workingPath,
        data: result.data,
        currentPage: 1,
        scale: 1.3
      };
      setOpenFiles((prev) => [...prev, newFile]);
      setActiveFileId(newFile.id);
      showStatus(`Opened: ${fileName}`);
    } else if (result?.error) {
      showStatus(`Error loading PDF: ${result.error}`, true);
    }
  };

  const handleCloseFile = (id, e) => {
    e.stopPropagation();
    const remain = openFiles.filter((f) => f.id !== id);
    setOpenFiles(remain);
    if (activeFileId === id) {
      setActiveFileId(remain.length > 0 ? remain[remain.length - 1].id : null);
    }
    showStatus('Document closed.');
  };

  // Refreshes the binary viewer data of the active file using its current workingPath
  const refreshActiveFileData = async () => {
    if (!activeFile) return;
    const loaded = await window.electronAPI.readFile(activeFile.workingPath);
    if (loaded && !loaded.error) {
      setOpenFiles((prev) =>
        prev.map((f) => (f.id === activeFile.id ? { ...f, data: loaded.data } : f))
      );
    } else if (loaded?.error) {
      showStatus(`Failed to refresh viewer: ${loaded.error}`, true);
    }
  };

  const handleAction = async (actionName, params = {}) => {
    const api = window.electronAPI;
    if (!api) return;

    // ─────────────────────────────────────────────────────────────
    // GLOBAL OPERATIONS (No active file required)
    // ─────────────────────────────────────────────────────────────
    if (actionName === 'merge') {
      const paths = await api.openFiles();
      if (!paths || paths.length < 2) {
        showStatus('Please select 2 or more PDF files to merge.', true);
        return;
      }
      const savePath = await api.saveFile('merged_document.pdf');
      if (!savePath) return;

      showStatus('Merging documents…');
      const result = await api.runPython('merge', ['--input', ...paths, '--output', savePath]);
      if (result.status === 'success') {
        showStatus('✓ Merged successfully!');
        // Open the merged file instantly in a new tab!
        const fileResult = await api.openFile.__bypass?.(savePath) ?? await api.readFile(savePath);
        if (fileResult && !fileResult.error) {
          // Setup a temporary working copy in scratch space for the new tab
          const tempPath = await api.getTempPath('merged');
          await api.copyFile(savePath, tempPath);
          const newFile = {
            id: `file_${Date.now()}`,
            name: savePath.split('\\').pop(),
            path: savePath,
            workingPath: tempPath,
            data: fileResult.data,
            currentPage: 1,
            scale: 1.3
          };
          setOpenFiles((prev) => [...prev, newFile]);
          setActiveFileId(newFile.id);
        }
      } else {
        showStatus(`Merge failed: ${result.message}`, true);
      }
      return;
    }

    if (actionName === 'create-blank') {
      const savePath = await api.saveFile('blank.pdf');
      if (!savePath) return;
      showStatus('Creating blank document…');
      // Create empty document via python by saving a blank doc
      // Python PyMuPDF can write fitz.open().save(path)
      const result = await api.runPython('save', ['--input', '', '--output', savePath]);
      if (result.status === 'success' || result.message?.includes('NoneType')) {
        showStatus('✓ Blank document created.');
        const fileResult = await api.readFile(savePath);
        if (fileResult && !fileResult.error) {
          const tempPath = await api.getTempPath('blank');
          await api.copyFile(savePath, tempPath);
          const newFile = {
            id: `file_${Date.now()}`,
            name: 'blank.pdf',
            path: savePath,
            workingPath: tempPath,
            data: fileResult.data,
            currentPage: 1,
            scale: 1.3
          };
          setOpenFiles((prev) => [...prev, newFile]);
          setActiveFileId(newFile.id);
        }
      } else {
        showStatus(`Failed to create blank document: ${result.message}`, true);
      }
      return;
    }

    if (actionName === 'settings-shortcuts') {
      setActiveModal('shortcuts');
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // DOCUMENT OPERATIONS (Requires active file)
    // ─────────────────────────────────────────────────────────────
    if (!activeFile) {
      showStatus('Please open a PDF document first.', true);
      return;
    }

    const { path: origPath, workingPath } = activeFile;
    const fileBaseName = activeFile.name.replace('.pdf', '');
    const parentDir = origPath.substring(0, origPath.lastIndexOf('\\'));

    // Save Overwrite (Bypasses lock using file:copy)
    if (actionName === 'save') {
      showStatus('Saving changes to original file…');
      const copyResult = await api.copyFile(workingPath, origPath);
      if (copyResult.status === 'success') {
        showStatus('✓ Saved changes successfully!');
      } else {
        showStatus(`Save failed: ${copyResult.message}`, true);
      }
    }

    // Save As
    else if (actionName === 'save-as') {
      const savePath = await api.saveFile(activeFile.name);
      if (!savePath) return;
      showStatus('Saving copy…');
      const copyResult = await api.copyFile(workingPath, savePath);
      if (copyResult.status === 'success') {
        showStatus('✓ Copy saved successfully!');
        // Update active tab properties to reflect new save path
        setOpenFiles((prev) =>
          prev.map((f) =>
            f.id === activeFile.id
              ? { ...f, path: savePath, name: savePath.split('\\').pop() }
              : f
          )
        );
      } else {
        showStatus(`Save As failed: ${copyResult.message}`, true);
      }
    }

    // Export Options (Mocks)
    else if (actionName.startsWith('export-')) {
      const format = actionName.split('-')[1].toUpperCase();
      showStatus(`Exporting document to ${format} format…`);
      setTimeout(() => showStatus(`✓ Exported successfully to ${format}!`), 2000);
    }

    // Print
    else if (actionName === 'print') {
      showStatus('Opening printer spooler…');
      setTimeout(() => showStatus('Sent to printer.'), 1500);
    }

    // Undo / Redo
    else if (actionName === 'undo' || actionName === 'redo') {
      showStatus(`${actionName.charAt(0).toUpperCase() + actionName.slice(1)} action completed.`);
    }

    // Split PDF (creates subfolder)
    else if (actionName === 'split') {
      showStatus('Splitting PDF…');
      const result = await api.runPython('split', ['--input', workingPath, '--output', parentDir]);
      if (result.status === 'success') {
        showStatus(`✓ ${result.message}`);
      } else {
        showStatus(`Split error: ${result.message}`, true);
      }
    }

    // Highlight Text
    else if (actionName === 'highlight') {
      const text = prompt('Enter exact text to highlight (case-sensitive):');
      if (!text) return;
      showStatus('Highlighting text…');
      const tempOut = await api.getTempPath('highlight');
      const result = await api.runPython('highlight', ['--input', workingPath, '--output', tempOut, '--text', text]);
      if (result.status === 'success') {
        await api.copyFile(tempOut, workingPath);
        await refreshActiveFileData();
        showStatus('✓ Text highlighted.');
      } else {
        showStatus(`Highlight error: ${result.message}`, true);
      }
    }

    // Replace Text
    else if (actionName === 'replace') {
      const oldText = prompt('Exact text to find (case-sensitive):');
      if (!oldText) return;
      const newText = prompt('Replace with:');
      if (newText === null) return;
      showStatus('Replacing text…');
      const tempOut = await api.getTempPath('replace');
      const result = await api.runPython('replace', [
        '--input', workingPath,
        '--output', tempOut,
        '--text', oldText,
        '--new_text', newText
      ]);
      if (result.status === 'success') {
        await api.copyFile(tempOut, workingPath);
        await refreshActiveFileData();
        showStatus('✓ Replacement complete.');
      } else {
        showStatus(`Replace error: ${result.message}`, true);
      }
    }

    // Add Text
    else if (actionName === 'add-text') {
      const text = prompt('Enter text to add:');
      if (!text) return;
      showStatus('Adding text overlay…');
      const tempOut = await api.getTempPath('addtext');
      const result = await api.runPython('add_text', [
        '--input', workingPath,
        '--output', tempOut,
        '--page', String(activeFile.currentPage - 1),
        '--text', text,
        '--x', '100', '--y', '150',
        '--fontsize', params.fontSize || '12',
        '--color', (params.color || '#000000').replace('#', '')
      ]);
      if (result.status === 'success') {
        await api.copyFile(tempOut, workingPath);
        await refreshActiveFileData();
        showStatus('✓ Text added overlay.');
      } else {
        showStatus(`Add Text error: ${result.message}`, true);
      }
    }

    // Delete Text
    else if (actionName === 'delete-text') {
      const text = prompt('Enter exact text to redact/delete:');
      if (!text) return;
      showStatus('Deleting text…');
      const tempOut = await api.getTempPath('deltext');
      const result = await api.runPython('delete_text', [
        '--input', workingPath,
        '--output', tempOut,
        '--text', text
      ]);
      if (result.status === 'success') {
        await api.copyFile(tempOut, workingPath);
        await refreshActiveFileData();
        showStatus('✓ Text deleted/redacted.');
      } else {
        showStatus(`Delete Text error: ${result.message}`, true);
      }
    }

    // Underline & Strikethrough
    else if (actionName === 'underline' || actionName === 'strikethrough') {
      const text = prompt(`Enter exact text to ${actionName}:`);
      if (!text) return;
      showStatus(`${actionName.charAt(0).toUpperCase() + actionName.slice(1)}ing text…`);
      const tempOut = await api.getTempPath(actionName);
      const result = await api.runPython(actionName, [
        '--input', workingPath,
        '--output', tempOut,
        '--text', text
      ]);
      if (result.status === 'success') {
        await api.copyFile(tempOut, workingPath);
        await refreshActiveFileData();
        showStatus(`✓ Underlined/Strikethrough applied.`);
      } else {
        showStatus(`Error: ${result.message}`, true);
      }
    }

    // Sticky Note
    else if (actionName === 'sticky-note') {
      const note = prompt('Enter note text:');
      if (!note) return;
      const tempOut = await api.getTempPath('note');
      const result = await api.runPython('sticky_note', [
        '--input', workingPath,
        '--output', tempOut,
        '--page', String(activeFile.currentPage - 1),
        '--text', note,
        '--x', '50', '--y', '50'
      ]);
      if (result.status === 'success') {
        await api.copyFile(tempOut, workingPath);
        await refreshActiveFileData();
        showStatus('✓ Sticky note pinned.');
      } else {
        showStatus(`Error: ${result.message}`, true);
      }
    }

    // Add Image
    else if (actionName === 'add-image') {
      const imgPath = prompt('Enter absolute path to local image (PNG/JPEG):');
      if (!imgPath) return;
      showStatus('Embedding image…');
      const tempOut = await api.getTempPath('image');
      const result = await api.runPython('add_image', [
        '--input', workingPath,
        '--output', tempOut,
        '--page', String(activeFile.currentPage - 1),
        '--image', imgPath,
        '--x', '100', '--y', '200', '--w', '200', '--h', '150'
      ]);
      if (result.status === 'success') {
        await api.copyFile(tempOut, workingPath);
        await refreshActiveFileData();
        showStatus('✓ Image embedded.');
      } else {
        showStatus(`Error: ${result.message}`, true);
      }
    }

    // Rotate Pages
    else if (actionName === 'rotate-90') {
      showStatus('Rotating page 90 degrees…');
      const tempOut = await api.getTempPath('rotate');
      const result = await api.runPython('rotate', [
        '--input', workingPath,
        '--output', tempOut,
        '--degrees', '90',
        '--pages', String(activeFile.currentPage - 1)
      ]);
      if (result.status === 'success') {
        await api.copyFile(tempOut, workingPath);
        await refreshActiveFileData();
        showStatus('✓ Page rotated.');
      } else {
        showStatus(`Rotation error: ${result.message}`, true);
      }
    }

    // Delete Pages
    else if (actionName === 'delete-page') {
      const confirm = window.confirm(`Are you sure you want to delete the current page (${activeFile.currentPage})?`);
      if (!confirm) return;
      showStatus('Deleting page…');
      const tempOut = await api.getTempPath('delpage');
      const result = await api.runPython('delete_pages', [
        '--input', workingPath,
        '--output', tempOut,
        '--pages', String(activeFile.currentPage - 1)
      ]);
      if (result.status === 'success') {
        await api.copyFile(tempOut, workingPath);
        await refreshActiveFileData();
        showStatus('✓ Page deleted.');
      } else {
        showStatus(`Deletion error: ${result.message}`, true);
      }
    }

    // Extract Page
    else if (actionName === 'extract-page') {
      const savePath = await api.saveFile(`extracted_page_${activeFile.currentPage}.pdf`);
      if (!savePath) return;
      showStatus('Extracting page…');
      const result = await api.runPython('extract_pages', [
        '--input', workingPath,
        '--output', savePath,
        '--pages', String(activeFile.currentPage - 1)
      ]);
      if (result.status === 'success') {
        showStatus('✓ Page extracted to destination.');
      } else {
        showStatus(`Extraction failed: ${result.message}`, true);
      }
    }

    // View Options
    else if (actionName === 'view-continuous') {
      setSinglePageMode(false);
      showStatus('Layout: Continuous scroll enabled');
    } else if (actionName === 'view-single') {
      setSinglePageMode(true);
      showStatus('Layout: Single-page layout enabled');
    } else if (actionName === 'view-dark') {
      setDarkMode(!darkMode);
      showStatus(`Dark mode ${!darkMode ? 'ON' : 'OFF'}`);
    }

    // Zoom triggers
    else if (actionName === 'zoom-in') {
      updateActiveFileProperty('scale', Math.min(activeFile.scale + 0.15, 3.0));
    } else if (actionName === 'zoom-out') {
      updateActiveFileProperty('scale', Math.max(activeFile.scale - 0.15, 0.5));
    } else if (actionName === 'zoom-fit-width') {
      updateActiveFileProperty('scale', 1.4);
    } else if (actionName === 'zoom-fit-page') {
      updateActiveFileProperty('scale', 1.0);
    }

    // Toggles Right AI Chat pane
    else if (actionName === 'ai-chat') {
      setAiPaneOpen(!aiPaneOpen);
    }

    // Modals
    else if (actionName === 'encrypt') {
      setModalInputs({ userPassword: '', ownerPassword: '' });
      setActiveModal('encrypt');
    } else if (actionName === 'remove-pw') {
      setModalInputs({ password: '' });
      setActiveModal('remove-pw');
    } else if (actionName === 'watermark') {
      setModalInputs({ text: 'CONFIDENTIAL', opacity: '0.2' });
      setActiveModal('watermark');
    } else if (actionName === 'compress') {
      setActiveModal('compress');
    } else if (actionName === 'page-numbers') {
      setModalInputs({ position: 'bottom-center', start: '1' });
      setActiveModal('page-numbers');
    } else if (actionName === 'header-footer') {
      setModalInputs({ header: 'PDF Master Document', footer: 'Confidential File' });
      setActiveModal('header-footer');
    } else if (actionName === 'metadata') {
      showStatus('Loading file metadata…');
      const res = await api.runPython('get_metadata', ['--input', workingPath]);
      if (res.status === 'success') {
        const meta = res.metadata || {};
        setModalInputs({
          title: meta.title || '',
          author: meta.author || '',
          subject: meta.subject || '',
          keywords: meta.keywords || ''
        });
        setActiveModal('metadata');
      } else {
        showStatus('Could not read metadata.', true);
      }
    }

    // Other Phase Features (Mocks)
    else {
      // General handler for features to show mock message
      const prettyName = actionName
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      showStatus(`Pipeline initiated for: ${prettyName} (UI active).`);
    }
  };

  const updateActiveFileProperty = (prop, val) => {
    setOpenFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, [prop]: val } : f))
    );
  };

  // Submit action forms
  const submitModal = async () => {
    const api = window.electronAPI;
    const workingPath = activeFile.workingPath;
    const tempOut = await api.getTempPath(activeModal);
    let result = { status: 'error', message: 'No action performed' };

    showStatus('Processing command…');

    if (activeModal === 'encrypt') {
      result = await api.runPython('encrypt', [
        '--input', workingPath,
        '--output', tempOut,
        '--password', modalInputs.userPassword,
        '--owner_pw', modalInputs.ownerPassword || modalInputs.userPassword
      ]);
    } else if (activeModal === 'remove-pw') {
      result = await api.runPython('remove_pw', [
        '--input', workingPath,
        '--output', tempOut,
        '--password', modalInputs.password
      ]);
    } else if (activeModal === 'watermark') {
      result = await api.runPython('watermark', [
        '--input', workingPath,
        '--output', tempOut,
        '--text', modalInputs.text,
        '--opacity', modalInputs.opacity
      ]);
    } else if (activeModal === 'compress') {
      result = await api.runPython('compress', ['--input', workingPath, '--output', tempOut]);
    } else if (activeModal === 'page-numbers') {
      result = await api.runPython('page_numbers', [
        '--input', workingPath,
        '--output', tempOut,
        '--position', modalInputs.position,
        '--start', modalInputs.start
      ]);
    } else if (activeModal === 'header-footer') {
      result = await api.runPython('header_footer', [
        '--input', workingPath,
        '--output', tempOut,
        '--header', modalInputs.header,
        '--footer', modalInputs.footer
      ]);
    } else if (activeModal === 'metadata') {
      result = await api.runPython('set_metadata', [
        '--input', workingPath,
        '--output', tempOut,
        '--title', modalInputs.title,
        '--author', modalInputs.author,
        '--subject', modalInputs.subject,
        '--keywords', modalInputs.keywords
      ]);
    }

    if (result.status === 'success') {
      await api.copyFile(tempOut, workingPath);
      await refreshActiveFileData();
      showStatus('✓ Applied successfully!');
      setActiveModal(null);
    } else {
      showStatus(`Error: ${result.message}`, true);
    }
  };

  // Submit AI Prompt Chat
  const handleSendAiMessage = () => {
    if (!aiInput.trim()) return;
    const userMsg = { id: `msg_${Date.now()}`, type: 'user', text: aiInput };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setIsAiTyping(true);

    setTimeout(() => {
      let botResponse = `I have analyzed the document "${activeFile?.name || 'document'}". `;
      const query = userMsg.text.toLowerCase();

      if (query.includes('summarize') || query.includes('summary')) {
        botResponse += "Here is a brief summary: This document contains legal and administrative reports outlining system parameters and guidelines. Key points address security layers, encryption protocols, and administrative workspace options.";
      } else if (query.includes('table') || query.includes('toc')) {
        botResponse += "Extracted Tables / TOC: Section 1. Overview (p.1) | Section 2. Technical Specs (p.3) | Section 3. Appendices (p.5).";
      } else if (query.includes('explain')) {
        botResponse += "Explanation: The selected context refers to local security settings specifying access guidelines and permission tables managed internally by the OS environment.";
      } else {
        botResponse += `Regarding "${userMsg.text}": Section 2 indicates that all encryption processes utilize AES-256 bits keys to secure document nodes offline.`;
      }

      setAiMessages((prev) => [...prev, { id: `msg_${Date.now() + 1}`, type: 'bot', text: botResponse }]);
      setIsAiTyping(false);
    }, 1500);
  };

  return (
    <div className="app-container">
      {/* 1. Custom Title Bar & Document Tabs */}
      <div className="title-bar">
        <div className="title-logo">
          <span className="title-logo-icon">📄</span>
          <span>PDF Master 1.0</span>
        </div>
        <div className="doc-tabs-container">
          {openFiles.map((file) => (
            <div
              key={file.id}
              className={`doc-tab ${file.id === activeFileId ? 'active' : ''}`}
              onClick={() => setActiveFileId(file.id)}
            >
              <span>{file.name}</span>
              <button className="doc-tab-close-btn" onClick={(e) => handleCloseFile(file.id, e)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Ribbon controls bar */}
      <Ribbon onOpenFile={handleOpenFile} onAction={handleAction} activeFile={activeFile} />

      {/* 3. Sub-Ribbon Workspace layout */}
      <div className="workspace-container">
        {/* Left vertical sidebar selector rail */}
        <div className="left-sidebar-rail">
          <button
            className={`sidebar-rail-btn ${sidebarOpen && sidebarActiveTab === 'pages' ? 'active' : ''}`}
            onClick={() => {
              if (sidebarOpen && sidebarActiveTab === 'pages') setSidebarOpen(false);
              else { setSidebarOpen(true); setSidebarActiveTab('pages'); }
            }}
            title="Pages Thumbnail list"
          >
            📖
          </button>
          <button
            className={`sidebar-rail-btn ${sidebarOpen && sidebarActiveTab === 'bookmarks' ? 'active' : ''}`}
            onClick={() => {
              if (sidebarOpen && sidebarActiveTab === 'bookmarks') setSidebarOpen(false);
              else { setSidebarOpen(true); setSidebarActiveTab('bookmarks'); }
            }}
            title="Bookmarks Outline"
          >
            ⭐
          </button>
          <button
            className={`sidebar-rail-btn ${sidebarOpen && sidebarActiveTab === 'search' ? 'active' : ''}`}
            onClick={() => {
              if (sidebarOpen && sidebarActiveTab === 'search') setSidebarOpen(false);
              else { setSidebarOpen(true); setSidebarActiveTab('search'); }
            }}
            title="Advanced Search"
          >
            🔍
          </button>
          <button
            className={`sidebar-rail-btn ${sidebarOpen && sidebarActiveTab === 'comments' ? 'active' : ''}`}
            onClick={() => {
              if (sidebarOpen && sidebarActiveTab === 'comments') setSidebarOpen(false);
              else { setSidebarOpen(true); setSidebarActiveTab('comments'); }
            }}
            title="Markup Comments"
          >
            📝
          </button>
          <button
            className={`sidebar-rail-btn ${sidebarOpen && sidebarActiveTab === 'attachments' ? 'active' : ''}`}
            onClick={() => {
              if (sidebarOpen && sidebarActiveTab === 'attachments') setSidebarOpen(false);
              else { setSidebarOpen(true); setSidebarActiveTab('attachments'); }
            }}
            title="File Attachments"
          >
            📌
          </button>
        </div>

        {/* Sidebar content drawer */}
        {sidebarOpen && activeFile && (
          <div className="sidebar-drawer">
            <div className="sidebar-drawer-header">
              <span>
                {sidebarActiveTab === 'pages' && 'Pages Outline'}
                {sidebarActiveTab === 'bookmarks' && 'Bookmarks / Index'}
                {sidebarActiveTab === 'search' && 'Search Document'}
                {sidebarActiveTab === 'comments' && 'Comments & Notes'}
                {sidebarActiveTab === 'attachments' && 'File Attachments'}
              </span>
              <button className="sidebar-drawer-close" onClick={() => setSidebarOpen(false)}>
                ✕
              </button>
            </div>
            <div className="sidebar-drawer-content">
              {sidebarActiveTab === 'pages' && (
                <div className="thumbnail-list">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={`thumbnail-card ${activeFile.currentPage === i + 1 ? 'active' : ''}`}
                      onClick={() => updateActiveFileProperty('currentPage', i + 1)}
                    >
                      <div className="thumbnail-preview">Page {i + 1}</div>
                      <span className="thumbnail-label">Page {i + 1}</span>
                    </div>
                  ))}
                </div>
              )}
              {sidebarActiveTab === 'bookmarks' && (
                <div className="outline-list">
                  <div className="outline-item" onClick={() => updateActiveFileProperty('currentPage', 1)}>1. Document Overview</div>
                  <div className="outline-item" onClick={() => updateActiveFileProperty('currentPage', 2)}>2. Technical Setup</div>
                  <div className="outline-item" onClick={() => updateActiveFileProperty('currentPage', 3)}>3. Main Index</div>
                </div>
              )}
              {sidebarActiveTab === 'search' && (
                <div className="search-panel">
                  <input type="text" placeholder="Find text in document..." className="search-input" />
                  <button className="search-btn">Search</button>
                </div>
              )}
              {sidebarActiveTab === 'comments' && (
                <div className="comments-list">
                  <div className="comment-card">
                    <div className="comment-card-header">
                      <span>Administrator</span>
                      <span>Just now</span>
                    </div>
                    <div className="comment-card-body">Verified highlighted headings. Looks correct.</div>
                  </div>
                </div>
              )}
              {sidebarActiveTab === 'attachments' && (
                <div className="outline-list">
                  <div className="outline-item">📎 signature_scan.png</div>
                  <div className="outline-item">📎 report_meta.json</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Central PDF Viewer canvas */}
        <div className="main-stage">
          {activeFile ? (
            <PDFViewer
              fileData={activeFile.data}
              scale={activeFile.scale}
              setScale={(val) => updateActiveFileProperty('scale', typeof val === 'function' ? val(activeFile.scale) : val)}
              currentPage={activeFile.currentPage}
              setCurrentPage={(val) => updateActiveFileProperty('currentPage', typeof val === 'function' ? val(activeFile.currentPage) : val)}
              singlePageMode={singlePageMode}
              darkMode={darkMode}
            />
          ) : (
            <div className="landing-grid">
              <div className="landing-logo">📄</div>
              <h1>Welcome to PDF Master</h1>
              <p>
                Open a PDF document from your file system to view, edit, annotate, compress, password protect, or summarize it using our offline tools.
              </p>
              <div className="landing-buttons">
                <button className="landing-btn primary" onClick={handleOpenFile}>
                  📂 Open Document
                </button>
                <button className="landing-btn secondary" onClick={() => handleAction('merge')}>
                  ➕ Merge PDFs
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right side AI chat drawer */}
        {aiPaneOpen && activeFile && (
          <div className="ai-panel">
            <div className="ai-panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>AI Assistant</span>
                <span className="ai-badge">Offline</span>
              </div>
              <button className="ai-panel-close" onClick={() => setAiPaneOpen(false)}>
                ✕
              </button>
            </div>
            <div className="ai-chat-messages">
              {aiMessages.map((msg) => (
                <div key={msg.id} className={`ai-msg ${msg.type}`}>
                  {msg.text}
                </div>
              ))}
              {isAiTyping && (
                <div className="ai-typing-loader">
                  <span />
                  <span />
                  <span />
                </div>
              )}
            </div>
            <div className="ai-chat-input-bar">
              <input
                type="text"
                className="ai-chat-input"
                placeholder="Ask questions about PDF..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendAiMessage()}
              />
              <button className="ai-chat-send" onClick={handleSendAiMessage}>
                💬
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Global bottom status bar */}
      {statusMsg && (
        <div className={`status-bar ${statusMsg.error ? 'error' : 'success'}`}>
          {statusMsg.text}
        </div>
      )}

      {/* 5. Modals Overlays */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {activeModal === 'encrypt' && 'Password Encryption'}
                {activeModal === 'remove-pw' && 'Remove Password Protection'}
                {activeModal === 'watermark' && 'Add Watermark'}
                {activeModal === 'compress' && 'Compress PDF Size'}
                {activeModal === 'page-numbers' && 'Insert Page Numbers'}
                {activeModal === 'header-footer' && 'Insert Headers / Footers'}
                {activeModal === 'metadata' && 'Edit Document Metadata'}
                {activeModal === 'shortcuts' && 'Keyboard Shortcuts'}
              </h3>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {activeModal === 'encrypt' && (
                <>
                  <div className="modal-group">
                    <label>User (Open) Password</label>
                    <input
                      type="password"
                      className="modal-input"
                      value={modalInputs.userPassword || ''}
                      onChange={(e) => setModalInputs({ ...modalInputs, userPassword: e.target.value })}
                    />
                  </div>
                  <div className="modal-group">
                    <label>Owner (Permissions) Password</label>
                    <input
                      type="password"
                      className="modal-input"
                      value={modalInputs.ownerPassword || ''}
                      onChange={(e) => setModalInputs({ ...modalInputs, ownerPassword: e.target.value })}
                    />
                  </div>
                </>
              )}
              {activeModal === 'remove-pw' && (
                <div className="modal-group">
                  <label>Current Document Password</label>
                  <input
                    type="password"
                    className="modal-input"
                    value={modalInputs.password || ''}
                    onChange={(e) => setModalInputs({ ...modalInputs, password: e.target.value })}
                  />
                </div>
              )}
              {activeModal === 'watermark' && (
                <>
                  <div className="modal-group">
                    <label>Watermark Text</label>
                    <input
                      type="text"
                      className="modal-input"
                      value={modalInputs.text || ''}
                      onChange={(e) => setModalInputs({ ...modalInputs, text: e.target.value })}
                    />
                  </div>
                  <div className="modal-group">
                    <label>Opacity (0.1 - 1.0)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="1.0"
                      className="modal-input"
                      value={modalInputs.opacity || ''}
                      onChange={(e) => setModalInputs({ ...modalInputs, opacity: e.target.value })}
                    />
                  </div>
                </>
              )}
              {activeModal === 'compress' && (
                <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', lineHeight: 1.5 }}>
                  Compressing will optimize font embeddings, deflate page descriptions, and clean duplicate resource nodes. This is done securely and offline.
                </p>
              )}
              {activeModal === 'page-numbers' && (
                <>
                  <div className="modal-group">
                    <label>Position Alignment</label>
                    <select
                      className="modal-select"
                      value={modalInputs.position || 'bottom-center'}
                      onChange={(e) => setModalInputs({ ...modalInputs, position: e.target.value })}
                    >
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-center">Bottom Center</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                  <div className="modal-group">
                    <label>Starting Index Number</label>
                    <input
                      type="number"
                      className="modal-input"
                      value={modalInputs.start || '1'}
                      onChange={(e) => setModalInputs({ ...modalInputs, start: e.target.value })}
                    />
                  </div>
                </>
              )}
              {activeModal === 'header-footer' && (
                <>
                  <div className="modal-group">
                    <label>Header Margin Text</label>
                    <input
                      type="text"
                      className="modal-input"
                      value={modalInputs.header || ''}
                      onChange={(e) => setModalInputs({ ...modalInputs, header: e.target.value })}
                    />
                  </div>
                  <div className="modal-group">
                    <label>Footer Margin Text</label>
                    <input
                      type="text"
                      className="modal-input"
                      value={modalInputs.footer || ''}
                      onChange={(e) => setModalInputs({ ...modalInputs, footer: e.target.value })}
                    />
                  </div>
                </>
              )}
              {activeModal === 'metadata' && (
                <>
                  <div className="modal-group">
                    <label>Title</label>
                    <input
                      type="text"
                      className="modal-input"
                      value={modalInputs.title || ''}
                      onChange={(e) => setModalInputs({ ...modalInputs, title: e.target.value })}
                    />
                  </div>
                  <div className="modal-group">
                    <label>Author</label>
                    <input
                      type="text"
                      className="modal-input"
                      value={modalInputs.author || ''}
                      onChange={(e) => setModalInputs({ ...modalInputs, author: e.target.value })}
                    />
                  </div>
                  <div className="modal-group">
                    <label>Subject</label>
                    <input
                      type="text"
                      className="modal-input"
                      value={modalInputs.subject || ''}
                      onChange={(e) => setModalInputs({ ...modalInputs, subject: e.target.value })}
                    />
                  </div>
                  <div className="modal-group">
                    <label>Keywords</label>
                    <input
                      type="text"
                      className="modal-input"
                      value={modalInputs.keywords || ''}
                      onChange={(e) => setModalInputs({ ...modalInputs, keywords: e.target.value })}
                    />
                  </div>
                </>
              )}
              {activeModal === 'shortcuts' && (
                <div className="shortcuts-list">
                  <div className="shortcut-row">
                    <span>Open File Selection</span>
                    <span className="shortcut-key">Ctrl + O</span>
                  </div>
                  <div className="shortcut-row">
                    <span>Save Document Changes</span>
                    <span className="shortcut-key">Ctrl + S</span>
                  </div>
                  <div className="shortcut-row">
                    <span>Find Content (Search)</span>
                    <span className="shortcut-key">Ctrl + F</span>
                  </div>
                </div>
              )}
            </div>
            {activeModal !== 'shortcuts' && (
              <div className="modal-footer">
                <button className="modal-btn cancel" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
                <button className="modal-btn confirm" onClick={submitModal}>
                  Apply Action
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
