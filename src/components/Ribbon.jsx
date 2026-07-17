import React, { useState } from 'react';
import './Ribbon.css';

const tabs = [
  { id: 'home', label: 'Home' },
  { id: 'pages', label: 'Pages' },
  { id: 'edit', label: 'Edit' },
  { id: 'annotate', label: 'Annotate' },
];

const Ribbon = ({ onOpenFile, onAction }) => {
  const [activeTab, setActiveTab] = useState('home');

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
        {activeTab === 'home' && (
          <div className="ribbon-group">
             <button className="ribbon-action-btn" onClick={onOpenFile}>
              <span className="icon">📂</span>
              Open PDF
            </button>
            <button className="ribbon-action-btn" onClick={() => onAction('save')}>
              <span className="icon">💾</span>
              Save
            </button>
            <span className="group-label">File</span>
          </div>
        )}
        {activeTab === 'pages' && (
          <div className="ribbon-group">
            <button className="ribbon-action-btn" onClick={() => onAction('split')}>
              <span className="icon">📄</span>
              Split
            </button>
            <button className="ribbon-action-btn" onClick={() => onAction('merge')}>
              <span className="icon">➕</span>
              Merge
            </button>
            <span className="group-label">Page Layout</span>
          </div>
        )}
        {activeTab === 'edit' && (
          <div className="ribbon-group">
            <button className="ribbon-action-btn" onClick={() => onAction('replace')}>
              <span className="icon">✏️</span>
              Replace Text
            </button>
            <span className="group-label">Text Editing</span>
          </div>
        )}
        {activeTab === 'annotate' && (
          <div className="ribbon-group">
            <button className="ribbon-action-btn" onClick={() => onAction('highlight')}>
              <span className="icon">🖍️</span>
              Highlight Text
            </button>
            <span className="group-label">Markup</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ribbon;
