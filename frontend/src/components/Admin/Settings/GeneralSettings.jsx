import React, { useState, useRef } from 'react';
import './GeneralSettings.css';

// SVG Icon from Assets
import generalIcon from '../../../assets/settings.svg';

function GeneralSettings({ platformName, adminEmail, onInputChange }) {
  const [logoFile, setLogoFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setLogoFile(file.name);
      alert(`Logo file "${file.name}" ready to be uploaded.`);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file.name);
      alert(`Logo file "${file.name}" ready to be uploaded.`);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="settings-card general-card">
      <div className="card-header-row">
        <div className="header-title-block">
          <img src={generalIcon} alt="General Settings" className="header-icon" />
          <h3 className="card-title">General</h3>
        </div>
      </div>

      <div className="card-body">
        {/* Platform Name Field */}
        <div className="input-group">
          <label className="input-label">Platform Name</label>
          <input
            type="text"
            className="settings-input"
            value={platformName}
            onChange={(e) => onInputChange('platformName', e.target.value)}
            placeholder="Enter platform display name"
          />
        </div>

        {/* Workspace Logo Drag Drop Field */}
        <div className="input-group">
          <label className="input-label">Workspace Logo</label>
          <div
            className={`logo-upload-zone ${isDragOver ? 'drag-active' : ''} ${logoFile ? 'file-loaded' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileInput}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
              accept=".svg,.png,.jpg,.jpeg"
            />
            <div className="upload-zone-content">
              {/* Media Image icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="image-svg-icon">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              {logoFile ? (
                <div className="loaded-file-info">
                  <span className="logo-filename">{logoFile}</span>
                  <span className="upload-hint-text">Click to replace logo file</span>
                </div>
              ) : (
                <div className="zone-text-block">
                  <span className="upload-action-text">Click to upload or drag logo</span>
                  <span className="upload-hint-text">SVG, PNG, JPG (max. 800×400px)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Admin Email Routing Field */}
        <div className="input-group">
          <label className="input-label">Admin Email Routing</label>
          <input
            type="email"
            className="settings-input"
            value={adminEmail}
            onChange={(e) => onInputChange('adminEmail', e.target.value)}
            placeholder="Enter system notification email"
          />
          <span className="helper-text">
            Used for critical system-level notifications and failover alerts.
          </span>
        </div>
      </div>
    </div>
  );
}

export default GeneralSettings;
