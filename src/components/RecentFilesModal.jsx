import React from 'react';
import './RecentFilesModal.css';

export function RecentFilesModal({ recentFiles, onClose, onOpenRecent }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="recent-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Recent Files</h2>
        {recentFiles.length === 0 ? (
          <p className="no-recent">No recent files found.</p>
        ) : (
          <div className="recent-list">
            {recentFiles.map((file, idx) => (
              <div key={idx} className="recent-item" onClick={() => { onOpenRecent(file.path); onClose(); }}>
                <span className="recent-icon">📄</span>
                <div className="recent-details">
                  <span className="recent-name">{file.name}</span>
                  <span className="recent-path">{file.path}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
