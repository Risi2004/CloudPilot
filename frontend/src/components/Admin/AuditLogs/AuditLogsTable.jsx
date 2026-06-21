import React, { useState } from 'react';
import './AuditLogsTable.css';

function AuditLogsTable({ logs }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Pagination Configuration
  const pageSize = 5;
  const totalLogs = logs.length;
  const totalPages = Math.ceil(totalLogs / pageSize) || 1;

  // Slice displayed logs
  const displayedLogs = logs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getSeverityClass = (severity, event) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'badge-critical';
      case 'WARNING':
        return 'badge-warning';
      case 'INFO':
        if (event.includes('Permission')) return 'badge-purple';
        if (event.includes('Hotfix')) return 'badge-grey';
        return 'badge-info';
      default:
        return 'badge-info';
    }
  };

  const getDotClass = (severity, event) => {
    if (severity.toUpperCase() === 'CRITICAL') return 'dot-critical';
    if (severity.toUpperCase() === 'WARNING') return 'dot-warning';
    if (event.includes('Scale') || event.includes('Optimized')) return 'dot-scale';
    if (event.includes('Permission')) return 'dot-permission';
    if (event.includes('Hotfix')) return 'dot-grey';
    return 'dot-info';
  };

  const toggleRowExpand = (id) => {
    if (expandedRowId === id) {
      setExpandedRowId(null);
    } else {
      setExpandedRowId(id);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedRowId(null);
  };

  return (
    <div className="audit-table-panel">
      <div className="audit-table-container">
        <table className="audit-table">
          <thead>
            <tr>
              <th style={{ width: '18%' }}>TIMESTAMP</th>
              <th style={{ width: '22%' }}>EVENT</th>
              <th style={{ width: '20%' }}>SUBJECT</th>
              <th style={{ width: '22%' }}>TARGET</th>
              <th style={{ width: '13%' }}>SEVERITY</th>
              <th style={{ width: '5%', textAlign: 'center' }}>DETAILS</th>
            </tr>
          </thead>
          <tbody>
            {displayedLogs.map((log) => {
              const isExpanded = expandedRowId === log.id;
              return (
                <React.Fragment key={log.id}>
                  <tr
                    className={`audit-row-item ${isExpanded ? 'active-row' : ''}`}
                    onClick={() => toggleRowExpand(log.id)}
                  >
                    <td className="timestamp-cell">{log.timestamp}</td>
                    <td>
                      <div className="event-cell">
                        <span className={`status-dot ${getDotClass(log.severity, log.event)}`} />
                        <span className="event-title">{log.event}</span>
                      </div>
                    </td>
                    <td className="subject-cell">{log.subject}</td>
                    <td className="target-cell">{log.target}</td>
                    <td>
                      <span className={`severity-badge ${getSeverityClass(log.severity, log.event)}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="details-arrow-cell" onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`row-expand-btn ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => toggleRowExpand(log.id)}
                        aria-label="Toggle Details"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Detail Tray */}
                  {isExpanded && (
                    <tr className="audit-expanded-row">
                      <td colSpan="6">
                        <div className="expanded-detail-content">
                          <div className="detail-grid">
                            <div className="detail-section">
                              <h4 className="detail-section-title">Event Information</h4>
                              <div className="detail-item">
                                <span className="detail-lbl">Description:</span>
                                <span className="detail-val">{log.details.description}</span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-lbl">Action Status:</span>
                                <span className={`detail-val status-pill ${log.details.status.toLowerCase()}`}>
                                  {log.details.status}
                                </span>
                              </div>
                            </div>
                            <div className="detail-section">
                              <h4 className="detail-section-title">Network & Identity</h4>
                              {log.details.ip && (
                                <div className="detail-item">
                                  <span className="detail-lbl">IP Address:</span>
                                  <span className="detail-val font-mono">{log.details.ip}</span>
                                </div>
                              )}
                              {log.details.userAgent && (
                                <div className="detail-item">
                                  <span className="detail-lbl">User Agent:</span>
                                  <span className="detail-val">{log.details.userAgent}</span>
                                </div>
                              )}
                              {log.details.agentId && (
                                <div className="detail-item">
                                  <span className="detail-lbl">Agent Identity:</span>
                                  <span className="detail-val font-mono">{log.details.agentId}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {log.details.payload && (
                            <div className="detail-payload-section">
                              <h4 className="detail-section-title">Raw Metadata Payload</h4>
                              <pre className="detail-raw-pre">
                                <code>{JSON.stringify(log.details.payload, null, 2)}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {displayedLogs.length === 0 && (
              <tr>
                <td colSpan="6" className="no-logs-cell">
                  No matching log records found in this timeframe.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalLogs > 0 && (
        <div className="audit-footer-row">
          <span className="footer-log-count">
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalLogs)} to{' '}
            {Math.min(currentPage * pageSize, totalLogs)} of {totalLogs.toLocaleString()} logs
          </span>

          <div className="pagination-controls">
            <button
              className="pag-nav-btn"
              onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Previous Page"
            >
              &lt;
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`pag-num-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}

            <button
              className="pag-nav-btn"
              onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage >= totalPages}
              aria-label="Next Page"
            >
              &gt;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogsTable;
