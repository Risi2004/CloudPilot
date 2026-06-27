import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ConnectorList.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FOLDER_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="folder-icon-svg">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const FILE_ICONS = {
  pdf: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="file-icon-type pdf">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
    </svg>
  ),
  doc: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="file-icon-type doc">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
    </svg>
  ),
  code: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="file-icon-type code">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  )
};

function ConnectorList({ onContentsChanged, onExplorerFolderChange }) {
  // Navigation stack state
  const [folderPath, setFolderPath] = useState([]);
  const currentFolder = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;

  // Folder & File list states
  const [subfolders, setSubfolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Operations states
  const [modalMode, setModalMode] = useState(null); // 'add-folder', 'edit-folder', 'delete-folder', 'delete-file'
  const [targetItem, setTargetItem] = useState(null); // Active item for edit/delete
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // File viewing states
  const [viewingFile, setViewingFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { current, total, name }
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const abortControllerRef = useRef(null);

  // Hidden File input ref
  const fileInputRef = useRef(null);
  // Hidden Folder input ref
  const folderInputRef = useRef(null);

  // Auto-dismiss notification alerts
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Fetch folders and files in current folder
  const fetchContents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const parentIdVal = currentFolder ? currentFolder._id : 'null';

      // 1. Fetch subfolders
      const folderRes = await fetch(`${API_URL}/api/knowledge/data-sources?parentId=${parentIdVal}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const folderData = await folderRes.json();
      
      // 2. Fetch files inside this datasource
      let fileList = [];
      if (currentFolder) {
        const fileRes = await fetch(`${API_URL}/api/knowledge/files?dataSourceId=${currentFolder._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const fileData = await fileRes.json();
        if (fileRes.ok) {
          fileList = fileData.files;
        }
      }

      if (folderRes.ok) {
        setSubfolders(folderData.sources);
        setFiles(fileList);
      }
    } catch (e) {
      console.error('Error fetching explorer contents:', e);
      setErrorMessage('Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, [folderPath]);

  useEffect(() => {
    if (!onExplorerFolderChange) return;
    const current = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;
    onExplorerFolderChange({
      dataSourceId: current?._id ?? null,
      folderKey: current?.folderKey ?? 'knowledge-base/',
      label: current?.name ?? 'All folders',
    });
  }, [folderPath, onExplorerFolderChange]);

  // Handle Breadcrumb Navigation
  const navigateToBreadcrumb = (index) => {
    if (index === -1) {
      setFolderPath([]);
    } else {
      setFolderPath(folderPath.slice(0, index + 1));
    }
  };

  const handleBack = () => {
    setFolderPath((prev) => prev.slice(0, prev.length - 1));
  };

  // Add subfolder / connector submit handler
  const handleModalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const token = localStorage.getItem('token');
      
      if (modalMode === 'add-folder') {
        const res = await fetch(`${API_URL}/api/knowledge/data-sources`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            name: inputValue.trim(), 
            sub: 'R2 Folder',
            parentId: currentFolder ? currentFolder._id : null
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to create folder.');
        setSuccessMessage(`Folder "${inputValue.trim()}" created successfully!`);
      } 
      
      else if (modalMode === 'edit-folder') {
        const res = await fetch(`${API_URL}/api/knowledge/data-sources/${targetItem._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name: inputValue.trim() })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to rename folder.');
        setSuccessMessage('Folder renamed successfully!');
      } 
      
      else if (modalMode === 'edit-file') {
        const res = await fetch(`${API_URL}/api/knowledge/files/${targetItem._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name: inputValue.trim() })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to rename document.');
        setSuccessMessage('Document renamed successfully!');
      }
      
      else if (modalMode === 'delete-folder') {
        const res = await fetch(`${API_URL}/api/knowledge/data-sources/${targetItem._id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to delete folder.');
        setSuccessMessage('Folder and all contents deleted successfully!');
      }

      else if (modalMode === 'delete-file') {
        const res = await fetch(`${API_URL}/api/knowledge/files/${targetItem._id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to delete file.');
        setSuccessMessage('File deleted successfully!');
      }

      setModalMode(null);
      setTargetItem(null);
      setInputValue('');
      fetchContents();
      if (onContentsChanged) onContentsChanged();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Shared Upload Routine
  const processFilesUpload = async (fileList) => {
    if (!fileList || fileList.length === 0 || !currentFolder) return;

    const rawFiles = Array.from(fileList);
    if (rawFiles.length > 1000) {
      setErrorMessage('You can only upload up to 1000 files at a time.');
      return;
    }

    // Pre-Upload Validation & Filtering
    const acceptedExtensions = ['.pdf', '.md', '.txt', '.json', '.yaml', '.yml', '.tf'];
    const maxSizeBytes = 25 * 1024 * 1024; // 25 MB

    const validFiles = rawFiles.filter(file => {
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      const isAcceptedExt = acceptedExtensions.includes(fileExt);
      const isUnderLimit = file.size <= maxSizeBytes;
      return isAcceptedExt && isUnderLimit;
    });

    const skippedCount = rawFiles.length - validFiles.length;

    if (validFiles.length === 0) {
      setErrorMessage('No supported files (PDF, MD, TXT, JSON, YAML, TF under 25MB) were found in the upload.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Create AbortController for cancellation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    let uploadedCount = 0;
    let failedCount = 0;

    const uploadSingleFile = (file) => {
      return new Promise((resolve, reject) => {
        if (signal.aborted) {
          return reject(new DOMException('Aborted', 'AbortError'));
        }

        const reader = new FileReader();

        const onAbort = () => {
          reader.abort();
          reject(new DOMException('Aborted', 'AbortError'));
        };
        signal.addEventListener('abort', onAbort);

        reader.onload = async () => {
          signal.removeEventListener('abort', onAbort);
          try {
            const base64Data = reader.result;
            const fileSizeStr = file.size > 1024 * 1024 
              ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
              : `${Math.round(file.size / 1024)} KB`;
            
            const fileExt = file.name.split('.').pop().toLowerCase();
            const typeMap = {
              pdf: 'pdf',
              md: 'doc',
              txt: 'doc',
              json: 'code',
              yaml: 'code',
              yml: 'code',
              tf: 'code'
            };
            const fileType = typeMap[fileExt] || 'pdf';
            const token = localStorage.getItem('token');

            const uploadRes = await fetch(`${API_URL}/api/knowledge/files`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                name: file.name,
                relativePath: file.webkitRelativePath || '',
                dataSourceId: currentFolder._id,
                fileData: base64Data,
                size: fileSizeStr,
                fileType
              }),
              signal
            });

            const uploadData = await uploadRes.json();
            if (!uploadRes.ok) {
              throw new Error(uploadData.message || `Failed to upload ${file.name}`);
            }
            resolve();
          } catch (err) {
            reject(err);
          }
        };

        reader.onerror = () => {
          signal.removeEventListener('abort', onAbort);
          reject(new Error(`Error reading ${file.name}`));
        };

        reader.readAsDataURL(file);
      });
    };

    try {
      let currentIndex = 0;
      const concurrencyLimit = 5;

      const runWorker = async () => {
        while (currentIndex < validFiles.length && !signal.aborted) {
          const index = currentIndex++;
          const file = validFiles[index];
          
          setUploadStatus({ 
            current: uploadedCount + failedCount + 1, 
            total: validFiles.length, 
            name: file.name 
          });

          try {
            await uploadSingleFile(file);
            uploadedCount++;
          } catch (err) {
            console.error(`Error uploading ${file.name}:`, err);
            failedCount++;
            if (err.name === 'AbortError' || signal.aborted) {
              throw err;
            }
          }
        }
      };

      const workers = [];
      for (let i = 0; i < Math.min(concurrencyLimit, validFiles.length); i++) {
        workers.push(runWorker());
      }
      await Promise.all(workers);

      let msg = `Successfully uploaded and indexed ${uploadedCount} file(s)!`;
      if (skippedCount > 0) {
        msg += ` Skipped ${skippedCount} unsupported or oversized file(s).`;
      }
      if (failedCount > 0) {
        msg += ` Failed to upload ${failedCount} file(s).`;
      }
      setSuccessMessage(msg);
    } catch (err) {
      if (err.name === 'AbortError' || signal.aborted) {
        setErrorMessage('Upload process canceled.');
      } else {
        setErrorMessage(err.message || 'Error uploading files.');
      }
    } finally {
      setIsSubmitting(false);
      setUploadStatus(null);
      abortControllerRef.current = null;
      fetchContents();
      if (onContentsChanged) onContentsChanged();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFilesUpload(e.target.files);
    }
    e.target.value = ''; // clear input
  };

  const handleFolderChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFilesUpload(e.target.files);
    }
    e.target.value = ''; // clear input
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Drag and drop event handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (!currentFolder) {
      setErrorMessage('Please navigate into a directory folder before uploading files.');
      return;
    }

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const filesArray = [];

      // Recursive helper to traverse FileSystemEntry
      const traverseEntry = async (entry, path = '') => {
        if (entry.isFile) {
          const file = await new Promise((resolve) => entry.file(resolve));
          // Define a webkitRelativePath property on the file object
          Object.defineProperty(file, 'webkitRelativePath', {
            value: path ? `${path}/${file.name}` : file.name,
            writable: true
          });
          filesArray.push(file);
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          
          // Read all entries in directory (handles pagination/batching)
          const readAllEntries = async () => {
            const allEntries = [];
            let readBatch = async () => {
              const entries = await new Promise((resolve) => dirReader.readEntries(resolve));
              if (entries.length > 0) {
                allEntries.push(...entries);
                await readBatch();
              }
            };
            await readBatch();
            return allEntries;
          };

          const entries = await readAllEntries();
          for (const childEntry of entries) {
            await traverseEntry(childEntry, path ? `${path}/${entry.name}` : entry.name);
          }
        }
      };

      setLoading(true);
      try {
        const promises = [];
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry();
          if (entry) {
            promises.push(traverseEntry(entry));
          }
        }
        await Promise.all(promises);
      } catch (err) {
        console.error('Error scanning folder:', err);
      } finally {
        setLoading(false);
      }

      if (filesArray.length > 0) {
        processFilesUpload(filesArray);
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFilesUpload(e.dataTransfer.files);
    }
  };

  const handleViewFile = async (file) => {
    try {
      setErrorMessage('');
      const token = localStorage.getItem('token');
      
      if (file.fileType === 'pdf') {
        setLoadingContent(true);
        const res = await fetch(`${API_URL}/api/knowledge/files/${file._id}/view`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load file.');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setLoadingContent(false);
        return;
      }

      setViewingFile(file);
      setLoadingContent(true);
      setFileContent(null);
      const res = await fetch(`${API_URL}/api/knowledge/files/${file._id}/view`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load file.');
      const text = await res.text();
      setFileContent(text);
    } catch (err) {
      setErrorMessage(err.message);
      setViewingFile(null);
    } finally {
      setLoadingContent(false);
    }
  };

  // Filter content by search query
  const filteredFolders = subfolders.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      className="connectors-panel-card full-width-explorer"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag and Drop Zone Overlay */}
      {isDragging && (
        <div className="explorer-drag-overlay">
          <div className="drag-overlay-message">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drag-icon-pulse">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span className="drag-overlay-title">Drop Files Here</span>
            <span className="drag-overlay-sub">Upload files directly to {currentFolder ? `"${currentFolder.name}"` : 'active folder'}</span>
          </div>
        </div>
      )}
      {/* Hidden file input */}
      <input 
        type="file" 
        ref={fileInputRef}
        style={{ display: 'none' }} 
        onChange={handleFileChange} 
        accept=".pdf,.md,.txt,.json,.yaml,.yml,.tf"
        multiple
      />
      <input 
        type="file" 
        ref={folderInputRef}
        style={{ display: 'none' }} 
        onChange={handleFolderChange} 
        webkitdirectory=""
        directory=""
        multiple
      />

      {/* Explorer Header */}
      <div className="connectors-header">
        <div className="header-left-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="connector-header-icon">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <span className="panel-title-text">Neural Repository Explorer</span>
        </div>

        {/* Global Notifications inside UI */}
        <div className="explorer-alerts-wrapper">
          {successMessage && <div className="explorer-alert success">{successMessage}</div>}
          {errorMessage && <div className="explorer-alert error">{errorMessage}</div>}
        </div>

        {/* Search & Actions block */}
        <div className="header-actions-row">
          <input 
            type="text" 
            placeholder="Search items..." 
            className="explorer-search-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Breadcrumbs Trail & Level Navigation */}
      <div className="explorer-breadcrumbs-bar">
        <div className="breadcrumbs-trail">
          <button 
            className={`breadcrumb-item-btn ${folderPath.length === 0 ? 'active' : ''}`}
            onClick={() => navigateToBreadcrumb(-1)}
          >
            Root
          </button>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder._id}>
              <span className="breadcrumb-separator">/</span>
              <button 
                className={`breadcrumb-item-btn ${index === folderPath.length - 1 ? 'active' : ''}`}
                onClick={() => navigateToBreadcrumb(index)}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {folderPath.length > 0 && (
          <button className="explorer-back-btn" onClick={handleBack}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
          </button>
        )}
      </div>

      {/* Main Explorer Directory List */}
      <div className="connectors-list">
        {loading ? (
          <div className="explorer-spinner-wrapper">
            <svg className="kb-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="12" cy="12" r="10" strokeDasharray="40 20" strokeLinecap="round" />
            </svg>
            <span>Indexing virtual directory...</span>
          </div>
        ) : (filteredFolders.length > 0 || filteredFiles.length > 0) ? (
          <>
            {/* List Folders */}
            {filteredFolders.map((folder) => (
              <div 
                key={folder._id} 
                className="connector-row clickable-folder"
                onClick={() => setFolderPath([...folderPath, folder])}
              >
                <div className="connector-info-left">
                  <div className="connector-logo-wrapper synced">
                    {FOLDER_ICON}
                  </div>
                  <div className="connector-text-group">
                    <span className="connector-name">{folder.name}</span>
                    <span className="connector-sub">{folder.sub || 'R2 Folder'}</span>
                  </div>
                </div>
                
                <div className="connector-status-right">
                  <span className="status-badge-synced">
                    <span className="status-dot green" />
                    Synced
                  </span>

                  {/* Actions for Edit & Delete Folder */}
                  <div className="connector-row-actions">
                    <button 
                      className="connector-action-btn edit" 
                      title="Rename Folder"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetItem(folder);
                        setInputValue(folder.name);
                        setModalMode('edit-folder');
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    </button>
                    <button 
                      className="connector-action-btn delete" 
                      title="Delete Folder"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetItem(folder);
                        setModalMode('delete-folder');
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* List Files */}
            {filteredFiles.map((file) => (
              <div 
                key={file._id} 
                className="connector-row file-row-item clickable-file"
                onClick={() => handleViewFile(file)}
              >
                <div className="connector-info-left">
                  <div className="connector-logo-wrapper file-icon-wrapper">
                    {FILE_ICONS[file.fileType] || FILE_ICONS.pdf}
                  </div>
                  <div className="connector-text-group">
                    <div className="file-name-container">
                      <span className="connector-name file-name">{file.name}</span>
                      <div className="file-tooltip-trigger" onClick={(e) => e.stopPropagation()}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="info-icon">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <div className="file-tooltip-content">
                          <div className="tooltip-row">
                            <span className="tooltip-label">ID:</span>
                            <span className="tooltip-value select-all">{file._id}</span>
                          </div>
                          <div className="tooltip-row">
                            <span className="tooltip-label">Uploaded:</span>
                            <span className="tooltip-value">{new Date(file.uploadedAt || file.createdAt || Date.now()).toLocaleString()}</span>
                          </div>
                          <div className="tooltip-row">
                            <span className="tooltip-label">Type:</span>
                            <span className="tooltip-value capitalize">{file.fileType}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <span className="connector-sub file-size">{file.size}</span>
                  </div>
                </div>
                
                <div className="connector-status-right">
                  <span className={`vector-status-badge ${file.status.toLowerCase()}`}>
                    {file.status === 'Indexing' && (
                      <svg className="indexing-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <circle cx="12" cy="12" r="10" strokeDasharray="30 20" strokeLinecap="round" />
                      </svg>
                    )}
                    {file.status}
                  </span>

                  {/* Actions for File */}
                  <div className="connector-row-actions">
                    <button 
                      className="connector-action-btn edit" 
                      title="View Document"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewFile(file);
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                    <button 
                      className="connector-action-btn edit" 
                      title="Rename Document"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetItem(file);
                        setInputValue(file.name);
                        setModalMode('edit-file');
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    </button>
                    <button 
                      className="connector-action-btn delete" 
                      title="Delete Document"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetItem(file);
                        setModalMode('delete-file');
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="explorer-empty-state">
            This directory is empty. Click "+ Add Folder" or "+ Add File" below.
          </div>
        )}
      </div>

      {/* Directory Action Buttons Row */}
      <div className="explorer-bottom-actions">
        <button 
          className="explorer-action-dashed-btn add-folder" 
          onClick={() => setModalMode('add-folder')}
          disabled={isSubmitting}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="12" y1="11" x2="12" y2="17"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
          Add Folder
        </button>

        {currentFolder && (
          <>
            <button 
              className="explorer-action-dashed-btn add-file" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              {isSubmitting ? 'Uploading...' : 'Add File'}
            </button>
            <button 
              className="explorer-action-dashed-btn add-folder-upload" 
              onClick={() => folderInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                <polyline points="12 11 12 17 9 14 15 14"></polyline>
                <line x1="12" y1="11" x2="12" y2="17"></line>
              </svg>
              Upload Folder
            </button>
          </>
        )}
      </div>

      {/* Overlay Modal Dialogs */}
      {modalMode && createPortal(
        <div className="kb-modal-overlay">
          <form onSubmit={handleModalSubmit} className="kb-modal-card">
            <h3 className="kb-modal-title">
              {modalMode === 'add-folder' && 'Create New Folder'}
              {modalMode === 'edit-folder' && 'Rename Folder'}
              {modalMode === 'delete-folder' && 'Delete Folder'}
              {modalMode === 'delete-file' && 'Delete Document'}
              {modalMode === 'edit-file' && 'Rename Document'}
            </h3>
            
            <p className="kb-modal-description">
              {modalMode === 'add-folder' && 'Enter a name for the new folder path in Cloudflare R2 and MongoDB.'}
              {modalMode === 'edit-folder' && `Enter a new name for "${targetItem?.name}". This will rename the folder in Cloudflare R2 and update all document links.`}
              {modalMode === 'delete-folder' && `Are you sure you want to delete "${targetItem?.name}"? All subfolders and files inside this directory in Cloudflare R2 and MongoDB will be deleted permanently.`}
              {modalMode === 'delete-file' && `Are you sure you want to permanently delete "${targetItem?.name}" from Cloudflare R2 and MongoDB?`}
              {modalMode === 'edit-file' && `Enter a new name for the document "${targetItem?.name}". This will update the object key in Cloudflare R2 and database record.`}
            </p>

            {modalMode !== 'delete-folder' && modalMode !== 'delete-file' && (
              <input
                type="text"
                className="kb-modal-input"
                placeholder={modalMode === 'edit-file' ? "Filename (e.g. info.md)" : "Folder Name (e.g. Policies)"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            )}

            <div className="kb-modal-actions">
              <button 
                type="button"
                className="kb-modal-btn cancel" 
                onClick={() => { setModalMode(null); setTargetItem(null); setInputValue(''); }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className={`kb-modal-btn submit ${(modalMode === 'delete-folder' || modalMode === 'delete-file') ? 'danger' : ''}`}
                disabled={isSubmitting || ((modalMode === 'add-folder' || modalMode === 'edit-folder' || modalMode === 'edit-file') && !inputValue.trim())}
              >
                {isSubmitting ? 'Processing...' : ((modalMode === 'delete-folder' || modalMode === 'delete-file') ? 'Delete' : 'Save')}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Global loading overlay for file viewing */}
      {loadingContent && createPortal(
        <div className="kb-modal-overlay">
          <div className="explorer-spinner-wrapper" style={{ background: '#0f172a', padding: '30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', zIndex: 9999 }}>
            <svg className="kb-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="12" cy="12" r="10" strokeDasharray="40 20" strokeLinecap="round" />
            </svg>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>Streaming object from Cloudflare R2...</span>
          </div>
        </div>,
        document.body
      )}

      {/* Global loading overlay for batch uploads */}
      {uploadStatus && createPortal(
        <div className="kb-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="kb-modal-card upload-progress-card">
            <div className="upload-progress-header">
              <svg className="kb-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="10" strokeDasharray="40 20" strokeLinecap="round" />
              </svg>
              <h3 className="kb-modal-title">Batch Indexing Progress</h3>
            </div>
            <div className="upload-progress-body">
              <div className="progress-details">
                <span className="progress-count">Uploading file {uploadStatus.current} of {uploadStatus.total}</span>
                <span className="progress-file-name">{uploadStatus.name}</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${(uploadStatus.current / uploadStatus.total) * 100}%` }}
                />
              </div>
              <button 
                type="button" 
                className="kb-modal-btn cancel abort-upload-btn"
                style={{ width: '100%', marginTop: '12px' }}
                onClick={handleCancelUpload}
              >
                Cancel Upload
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modern File Viewer Overlay */}
      {viewingFile && fileContent !== null && createPortal(
        <div className="kb-modal-overlay file-viewer-overlay" style={{ zIndex: 9999 }}>
          <div className="kb-modal-card file-viewer-card">
            <div className="file-viewer-header">
              <div className="header-left">
                {FILE_ICONS[viewingFile.fileType] || FILE_ICONS.pdf}
                <span className="file-viewer-title">{viewingFile.name}</span>
              </div>
              <button 
                type="button"
                className="close-viewer-btn" 
                onClick={() => { setViewingFile(null); setFileContent(null); }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="file-viewer-body">
              {viewingFile.name.toLowerCase().endsWith('.md') ? (
                <div className="markdown-doc-view">
                  {fileContent.split('\n').map((line, idx) => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('# ')) {
                      return <h1 key={idx}>{trimmed.substring(2)}</h1>;
                    } else if (trimmed.startsWith('## ')) {
                      return <h2 key={idx}>{trimmed.substring(3)}</h2>;
                    } else if (trimmed.startsWith('### ')) {
                      return <h3 key={idx}>{trimmed.substring(4)}</h3>;
                    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                      return <li key={idx} className="md-list-item">{trimmed.substring(2)}</li>;
                    } else if (trimmed.startsWith('1. ')) {
                      return <li key={idx} className="md-ordered-item">{trimmed.substring(3)}</li>;
                    } else if (trimmed === '') {
                      return <div key={idx} className="md-empty-space" />;
                    } else {
                      return <p key={idx}>{line}</p>;
                    }
                  })}
                </div>
              ) : (
                <pre className="file-viewer-pre">
                  <code>{fileContent}</code>
                </pre>
              )}
            </div>

            <div className="kb-modal-actions">
              <button 
                type="button"
                className="kb-modal-btn cancel" 
                onClick={() => { setViewingFile(null); setFileContent(null); }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default ConnectorList;
