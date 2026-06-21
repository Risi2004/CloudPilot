import React, { useState, useEffect } from 'react';
import './IndexedDocs.css';

const INITIAL_DOCS = [
  {
    id: 'doc-1',
    name: 'aws-security-audit-2024.pdf',
    source: 'S3 Bucket / Audit',
    size: '14.2 MB',
    status: 'Ready',
    fileType: 'pdf'
  },
  {
    id: 'doc-2',
    name: 'docker-compose.prod.yaml',
    source: 'GitHub Repo / Main',
    size: '256 KB',
    status: 'Ready',
    fileType: 'code'
  },
  {
    id: 'doc-3',
    name: 'infra-schema.tf',
    source: 'Terraform Cloud',
    size: '1.1 MB',
    status: 'Indexing',
    fileType: 'code'
  },
  {
    id: 'doc-4',
    name: 'enterprise-compliance-manual.md',
    source: 'Manual Upload',
    size: '88 KB',
    status: 'Ready',
    fileType: 'doc'
  },
  {
    id: 'doc-5',
    name: 'render-deploy-v2.json',
    source: 'Render API',
    size: '42 KB',
    status: 'Failed',
    fileType: 'code'
  }
];

function IndexedDocs({ uploadTrigger }) {
  const [docs, setDocs] = useState(INITIAL_DOCS);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Monitor simulated manual doc uploads from parent component
  useEffect(() => {
    if (uploadTrigger) {
      const newDocId = `doc-${Date.now()}`;
      const newDoc = {
        id: newDocId,
        name: uploadTrigger.name || 'manual-upload.pdf',
        source: 'Manual Upload',
        size: uploadTrigger.size || '124 KB',
        status: 'Indexing',
        fileType: uploadTrigger.fileType || 'pdf'
      };

      setDocs((prev) => [newDoc, ...prev]);
      setCurrentPage(1); // Go back to page 1 to see the upload

      // Simulate indexing transition to Ready
      setTimeout(() => {
        setDocs((prev) => 
          prev.map((d) => d.id === newDocId ? { ...d, status: 'Ready' } : d)
        );
      }, 2000);
    }
  }, [uploadTrigger]);

  // Handle Search Filtering
  const filteredDocs = docs.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Simple Pagination
  const pageSize = 5;
  const totalPages = Math.ceil(filteredDocs.length / pageSize) || 1;
  const displayedDocs = filteredDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getFileIcon = (fileType) => {
    if (fileType === 'pdf') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="file-icon-type pdf">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      );
    } else if (fileType === 'doc') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="file-icon-type doc">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      );
    } else {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="file-icon-type code">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
      );
    }
  };

  return (
    <div className="indexed-docs-card">
      <div className="docs-header-row">
        <div className="docs-title-wrapper">
          <h3 className="docs-card-title">Indexed Documentation</h3>
          <input 
            type="text" 
            placeholder="Search indexed files..." 
            className="docs-search-field"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
        
        <div className="docs-action-buttons">
          <button className="docs-btn-filter" onClick={() => alert('Index filtering drawer coming soon!')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filter
          </button>
          
          <button className="docs-btn-filter" onClick={() => alert('Sorting updated.')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
            Latest
          </button>
        </div>
      </div>

      <div className="docs-table-wrapper">
        <table className="docs-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Source</th>
              <th>Size</th>
              <th>Vector Status</th>
            </tr>
          </thead>
          <tbody>
            {displayedDocs.length > 0 ? (
              displayedDocs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className="file-name-cell">
                      {getFileIcon(doc.fileType)}
                      <span className="file-name-text">{doc.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="doc-source-text">{doc.source}</span>
                  </td>
                  <td>
                    <span className="doc-size-text">{doc.size}</span>
                  </td>
                  <td>
                    <span className={`vector-status-badge ${doc.status.toLowerCase()}`}>
                      {doc.status === 'Indexing' && (
                        <svg className="indexing-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <circle cx="12" cy="12" r="10" strokeDasharray="30 20" strokeLinecap="round" />
                        </svg>
                      )}
                      {doc.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="empty-table-cell">No indexed documents match your criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Pagination controls */}
      <div className="docs-footer-pagination">
        <span className="footer-doc-count">
          Showing {displayedDocs.length} of {filteredDocs.length} files
        </span>
        
        <div className="pagination-arrows-row">
          <button 
            className="arrow-pag-btn" 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            &lt;
          </button>
          <span className="current-page-label">Page {currentPage}</span>
          <button 
            className="arrow-pag-btn" 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage >= totalPages}
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}

export default IndexedDocs;
