import React, { useState } from 'react';
import './Ribbon.css';

const tabs = [
  { id: 'home', label: 'Home' },
  { id: 'edit', label: 'Edit' },
  { id: 'annotate', label: 'Annotate' },
  { id: 'insert', label: 'Insert' },
  { id: 'organize', label: 'Organize' },
  { id: 'convert', label: 'Convert' },
  { id: 'protect', label: 'Protect' },
  { id: 'ai', label: 'AI features' },
  { id: 'view', label: 'View' },
  { id: 'settings', label: 'Settings' },
];

const Ribbon = ({ onOpenFile, onAction, activeFile }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState('12');
  const [color, setColor] = useState('#000000');

  const handleAction = (action) => {
    onAction(action, { font, fontSize, color });
  };

  return (
    <div className="ribbon-container">
      <div className="ribbon-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`ribbon-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="ribbon-content">
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="ribbon-tab-pane">
            <div className="ribbon-group">
              <button className="ribbon-action-btn primary" onClick={onOpenFile}>
                <span className="icon">📂</span>
                Open PDF
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('save')} disabled={!activeFile}>
                <span className="icon">💾</span>
                Save
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('save-as')} disabled={!activeFile}>
                <span className="icon">📥</span>
                Save As
              </button>
              <div className="dropdown-container">
                <button className="ribbon-action-btn" onClick={() => setShowExportMenu(!showExportMenu)} disabled={!activeFile}>
                  <span className="icon">📤</span>
                  Export ▾
                </button>
                {showExportMenu && (
                  <div className="dropdown-menu">
                    <button onClick={() => { handleAction('export-word'); setShowExportMenu(false); }}>Word (.docx)</button>
                    <button onClick={() => { handleAction('export-excel'); setShowExportMenu(false); }}>Excel (.xlsx)</button>
                    <button onClick={() => { handleAction('export-ppt'); setShowExportMenu(false); }}>PowerPoint (.pptx)</button>
                    <button onClick={() => { handleAction('export-images'); setShowExportMenu(false); }}>Images (JPEG/PNG)</button>
                  </div>
                )}
              </div>
              <button className="ribbon-action-btn" onClick={() => handleAction('print')} disabled={!activeFile}>
                <span className="icon">🖨️</span>
                Print
              </button>
              <span className="group-label">File Actions</span>
            </div>
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('undo')}>
                <span className="icon">↩️</span>
                Undo
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('redo')}>
                <span className="icon">↪️</span>
                Redo
              </button>
              <span className="group-label">History</span>
            </div>
          </div>
        )}

        {/* EDIT TAB */}
        {activeTab === 'edit' && (
          <div className="ribbon-tab-pane">
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('replace')} disabled={!activeFile}>
                <span className="icon">✏️</span>
                Replace Text
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('add-text')} disabled={!activeFile}>
                <span className="icon">➕</span>
                Add Text
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('delete-text')} disabled={!activeFile}>
                <span className="icon">🗑️</span>
                Delete Text
              </button>
              <span className="group-label">Text Edit</span>
            </div>
            <div className="ribbon-group font-group">
              <select className="ribbon-select" value={font} onChange={(e) => setFont(e.target.value)} disabled={!activeFile}>
                <option>Arial</option>
                <option>Helvetica</option>
                <option>Times New Roman</option>
                <option>Courier New</option>
                <option>Georgia</option>
              </select>
              <select className="ribbon-select" value={fontSize} onChange={(e) => setFontSize(e.target.value)} disabled={!activeFile}>
                <option>9</option>
                <option>10</option>
                <option>11</option>
                <option>12</option>
                <option>14</option>
                <option>16</option>
                <option>18</option>
                <option>24</option>
                <option>32</option>
              </select>
              <input type="color" className="ribbon-color" value={color} onChange={(e) => setColor(e.target.value)} disabled={!activeFile} />
              <span className="group-label">Font Style</span>
            </div>
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('add-image')} disabled={!activeFile}>
                <span className="icon">🖼️</span>
                Add Image
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('resize-image')} disabled={!activeFile}>
                <span className="icon">📐</span>
                Resize Image
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('move-text')} disabled={!activeFile}>
                <span className="icon">🖐️</span>
                Move Text
              </button>
              <span className="group-label">Objects</span>
            </div>
          </div>
        )}

        {/* ANNOTATE TAB */}
        {activeTab === 'annotate' && (
          <div className="ribbon-tab-pane">
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('highlight')} disabled={!activeFile}>
                <span className="icon">🖍️</span>
                Highlight
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('underline')} disabled={!activeFile}>
                <span className="icon">✍️</span>
                Underline
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('strikethrough')} disabled={!activeFile}>
                <span className="icon">🪓</span>
                Strikethrough
              </button>
              <span className="group-label">Text Markup</span>
            </div>
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('draw')} disabled={!activeFile}>
                <span className="icon">✏️</span>
                Draw Freehand
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('sticky-note')} disabled={!activeFile}>
                <span className="icon">📌</span>
                Sticky Note
              </button>
              <span className="group-label">Quick Notes</span>
            </div>
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('shape-rect')} disabled={!activeFile}>
                <span className="icon">⬛</span>
                Rectangle
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('shape-circle')} disabled={!activeFile}>
                <span className="icon">⭕</span>
                Circle
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('shape-arrow')} disabled={!activeFile}>
                <span className="icon">↗️</span>
                Arrow
              </button>
              <span className="group-label">Shapes</span>
            </div>
          </div>
        )}

        {/* INSERT TAB */}
        {activeTab === 'insert' && (
          <div className="ribbon-tab-pane">
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('insert-blank')} disabled={!activeFile}>
                <span className="icon">📄</span>
                Blank Page
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('insert-file')} disabled={!activeFile}>
                <span className="icon">📥</span>
                Insert PDF File
              </button>
              <span className="group-label">Insert Pages</span>
            </div>
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('header-footer')} disabled={!activeFile}>
                <span className="icon">📰</span>
                Header/Footer
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('page-numbers')} disabled={!activeFile}>
                <span className="icon">🔢</span>
                Page Numbers
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('watermark')} disabled={!activeFile}>
                <span className="icon">🌊</span>
                Watermark
              </button>
              <span className="group-label">Layout Overlays</span>
            </div>
          </div>
        )}

        {/* ORGANIZE TAB */}
        {activeTab === 'organize' && (
          <div className="ribbon-tab-pane">
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('split')} disabled={!activeFile}>
                <span className="icon">✂️</span>
                Split PDF
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('merge')}>
                <span className="icon">➕</span>
                Merge PDFs
              </button>
              <span className="group-label">Page Ops</span>
            </div>
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('rotate-90')} disabled={!activeFile}>
                <span className="icon">↪️</span>
                Rotate Page
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('delete-page')} disabled={!activeFile}>
                <span className="icon">❌</span>
                Delete Page
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('duplicate-page')} disabled={!activeFile}>
                <span className="icon">📋</span>
                Duplicate Page
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('extract-page')} disabled={!activeFile}>
                <span className="icon">📦</span>
                Extract Page
              </button>
              <span className="group-label">Manage Selection</span>
            </div>
          </div>
        )}

        {/* CONVERT TAB */}
        {activeTab === 'convert' && (
          <div className="ribbon-tab-pane">
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('create-blank')}>
                <span className="icon">📄</span>
                Create Blank PDF
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('convert-images')}>
                <span className="icon">🖼️</span>
                Images → PDF
              </button>
              <div className="dropdown-container">
                <button className="ribbon-action-btn" onClick={() => setShowConvertMenu(!showConvertMenu)}>
                  <span className="icon">📝</span>
                  Office → PDF ▾
                </button>
                {showConvertMenu && (
                  <div className="dropdown-menu">
                    <button onClick={() => { handleAction('convert-word'); setShowConvertMenu(false); }}>Word to PDF</button>
                    <button onClick={() => { handleAction('convert-excel'); setShowConvertMenu(false); }}>Excel to PDF</button>
                    <button onClick={() => { handleAction('convert-ppt'); setShowConvertMenu(false); }}>PowerPoint to PDF</button>
                  </div>
                )}
              </div>
              <button className="ribbon-action-btn" onClick={() => handleAction('convert-scan')}>
                <span className="icon">🖨️</span>
                Scan to PDF
              </button>
              <span className="group-label">PDF Creation</span>
            </div>
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('ocr-scan')} disabled={!activeFile}>
                <span className="icon">🔍</span>
                OCR Scan PDF
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('ocr-searchable')} disabled={!activeFile}>
                <span className="icon">📄</span>
                Make Searchable
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('ocr-copy')} disabled={!activeFile}>
                <span className="icon">📋</span>
                Copy Text From Scans
              </button>
              <span className="group-label">Optical Character Recognition</span>
            </div>
          </div>
        )}

        {/* PROTECT TAB */}
        {activeTab === 'protect' && (
          <div className="ribbon-tab-pane">
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('encrypt')} disabled={!activeFile}>
                <span className="icon">🔒</span>
                Encrypt / Password
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('remove-pw')} disabled={!activeFile}>
                <span className="icon">🔓</span>
                Remove Password
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('permissions')} disabled={!activeFile}>
                <span className="icon">⚙️</span>
                Permissions
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('redact')} disabled={!activeFile}>
                <span className="icon">⬛</span>
                Apply Redaction
              </button>
              <span className="group-label">Security</span>
            </div>
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('sign-draw')} disabled={!activeFile}>
                <span className="icon">✍️</span>
                Draw Signature
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('sign-type')} disabled={!activeFile}>
                <span className="icon">🔤</span>
                Type Signature
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('sign-upload')} disabled={!activeFile}>
                <span className="icon">📤</span>
                Upload Signature
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('sign-cert')} disabled={!activeFile}>
                <span className="icon">📜</span>
                Digital Certificate
              </button>
              <span className="group-label">Signatures</span>
            </div>
          </div>
        )}

        {/* AI FEATURES TAB */}
        {activeTab === 'ai' && (
          <div className="ribbon-tab-pane">
            <div className="ribbon-group">
              <button className="ribbon-action-btn ai-btn" onClick={() => handleAction('ai-chat')} disabled={!activeFile}>
                <span className="icon">💬</span>
                Chat with PDF
              </button>
              <button className="ribbon-action-btn ai-btn" onClick={() => handleAction('ai-summarize')} disabled={!activeFile}>
                <span className="icon">📝</span>
                Summarize PDF
              </button>
              <button className="ribbon-action-btn ai-btn" onClick={() => handleAction('ai-explain')} disabled={!activeFile}>
                <span className="icon">🤔</span>
                Explain Selected
              </button>
              <button className="ribbon-action-btn ai-btn" onClick={() => handleAction('ai-rewrite')} disabled={!activeFile}>
                <span className="icon">✍️</span>
                Rewrite Selected
              </button>
              <button className="ribbon-action-btn ai-btn" onClick={() => handleAction('ai-translate')} disabled={!activeFile}>
                <span className="icon">🌐</span>
                Translate Pages
              </button>
              <span className="group-label">Cognitive Actions</span>
            </div>
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('ai-toc')} disabled={!activeFile}>
                <span className="icon">📖</span>
                Generate TOC
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('ai-tables')} disabled={!activeFile}>
                <span className="icon">📊</span>
                Extract Tables
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('ai-flashcards')} disabled={!activeFile}>
                <span className="icon">🃏</span>
                Generate Flashcards
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('ai-markdown')} disabled={!activeFile}>
                <span className="icon">🔽</span>
                PDF to Markdown
              </button>
              <span className="group-label">Data Extraction</span>
            </div>
          </div>
        )}

        {/* VIEW TAB */}
        {activeTab === 'view' && (
          <div className="ribbon-tab-pane">
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('view-continuous')} disabled={!activeFile}>
                <span className="icon">📜</span>
                Continuous Scroll
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('view-single')} disabled={!activeFile}>
                <span className="icon">📄</span>
                Single-Page Mode
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('view-dark')} disabled={!activeFile}>
                <span className="icon">🌙</span>
                Dark Mode Toggle
              </button>
              <span className="group-label">Layout Mode</span>
            </div>
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('zoom-in')} disabled={!activeFile}>
                <span className="icon">➕</span>
                Zoom In
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('zoom-out')} disabled={!activeFile}>
                <span className="icon">➖</span>
                Zoom Out
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('zoom-fit-width')} disabled={!activeFile}>
                <span className="icon">↔️</span>
                Fit Width
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('zoom-fit-page')} disabled={!activeFile}>
                <span className="icon">⛶</span>
                Fit Page
              </button>
              <span className="group-label">Zoom controls</span>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="ribbon-tab-pane">
            <div className="ribbon-group">
              <button className="ribbon-action-btn" onClick={() => handleAction('settings-shortcuts')}>
                <span className="icon">⌨️</span>
                Shortcuts
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('settings-recent')}>
                <span className="icon">📁</span>
                Recent Files
              </button>
              <button className="ribbon-action-btn" onClick={() => handleAction('settings-autosave')}>
                <span className="icon">⏲️</span>
                Auto-save (On)
              </button>
              <span className="group-label">App Settings</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ribbon;
