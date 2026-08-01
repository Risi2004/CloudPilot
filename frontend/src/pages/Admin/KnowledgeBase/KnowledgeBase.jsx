import React, { useState, useEffect } from 'react';
import './KnowledgeBase.css';

// Layout and widgets
import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import VectorStats from '../../../components/Admin/KnowledgeBase/VectorStats';
import ConnectorList from '../../../components/Admin/KnowledgeBase/ConnectorList';
import OptimizationInsight from '../../../components/Admin/KnowledgeBase/OptimizationInsight';
import VectorizeModal from '../../../components/Admin/KnowledgeBase/VectorizeModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function KnowledgeBase() {
  const [rebuildTriggered, setRebuildTriggered] = useState(0);
  const [showVectorizeModal, setShowVectorizeModal] = useState(false);
  const [storageSize, setStorageSize] = useState('-');
  const [mdFileCount, setMdFileCount] = useState('-');
  const [totalVectors, setTotalVectors] = useState('-');

  const [activeJobId, setActiveJobId] = useState(() => localStorage.getItem('activeVectorizeJobId') || null);
  const [activeJob, setActiveJob] = useState(null);

  const fetchStorageSize = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/knowledge/storage-size`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setStorageSize(data.storageSize);
        setMdFileCount(data.mdFileCount);
      }
    } catch (e) {
      console.error('Error fetching storage size:', e);
    }
  };

  const fetchVectorCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/knowledge/vectorization-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTotalVectors(data.totalVectorChunks);
      }
    } catch (e) {
      console.error('Error fetching vector count:', e);
    }
  };

  useEffect(() => {
    fetchStorageSize();
    fetchVectorCount();
  }, [rebuildTriggered]);

  // Background Polling for Vectorization Job
  useEffect(() => {
    if (!activeJobId) {
      setActiveJob(null);
      return;
    }

    let isMounted = true;
    let timerId = null;

    const poll = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/knowledge/vectorize/${activeJobId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to poll active job.');

        if (!isMounted) return;

        setActiveJob(data.job);

        if (data.job.status === 'running') {
          timerId = setTimeout(poll, 1500);
        } else {
          // Job complete (success or failed)
          localStorage.removeItem('activeVectorizeJobId');
          setRebuildTriggered(prev => prev + 1);
        }
      } catch (err) {
        console.error('Error polling background job:', err);
        if (isMounted) {
          timerId = setTimeout(poll, 3000); // Retry after error
        }
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [activeJobId]);

  const handleRebuildDB = () => {
    setShowVectorizeModal(true);
  };

  const handleVectorizeComplete = (jobId) => {
    setActiveJobId(jobId);
    setRebuildTriggered((prev) => prev + 1);
  };

  const dismissJobBanner = () => {
    setActiveJob(null);
    setActiveJobId(null);
    localStorage.removeItem('activeVectorizeJobId');
  };

  return (
    <div className="admin-dashboard-container">
      {/* Left Sidebar */}
      <AdminSidebar activeTab="knowledge-base" />

      {/* Right Content Area */}
      <main className="admin-dashboard-main">
        <div className="admin-subview">
          
          {/* Header Row */}
          <div className="knowledge-header-row">
            <div className="header-left">
              <span className="kb-super-label">SEMANTIC INDEXING</span>
              <h1 className="knowledge-page-title">Neural Repository</h1>
            </div>
            
            <div className="header-right">
              {/* Rebuild Vector DB trigger */}
              <button
                className="kb-action-btn primary"
                onClick={handleRebuildDB}
                disabled={activeJob && activeJob.status === 'running'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                {activeJob && activeJob.status === 'running' ? 'Rebuilding...' : 'Rebuild Vector DB'}
              </button>
            </div>
          </div>

          {/* Background Job Progress Banner */}
          {activeJob && (
            <div className={`kb-background-job-banner ${activeJob.status !== 'running' ? 'completed' : ''}`}>
              <div className="job-banner-info">
                <div className="job-banner-title">
                  {activeJob.status === 'running' ? (
                    <>
                      <svg className="kb-spinner-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <circle cx="12" cy="12" r="10" strokeDasharray="40 20" strokeLinecap="round" />
                      </svg>
                      <span>Rebuilding Vector Database...</span>
                    </>
                  ) : activeJob.status === 'completed' ? (
                    <span>✓ Vector Database Rebuilt Successfully</span>
                  ) : (
                    <span style={{ color: '#ef4444' }}>✗ Vector Database Rebuild Failed</span>
                  )}
                </div>
                <span className="job-banner-percentage">
                  {Math.round((activeJob.total ? ((activeJob.completed + activeJob.failed) / activeJob.total) * 100 : 0))}%
                </span>
              </div>
              
              <div className="job-banner-progress-bar">
                <div 
                  className="job-banner-progress-fill" 
                  style={{ width: `${activeJob.total ? ((activeJob.completed + activeJob.failed) / activeJob.total) * 100 : 0}%` }}
                />
              </div>
              
              <div className="job-banner-details">
                <span>
                  Processed {activeJob.completed + activeJob.failed} of {activeJob.total} files
                  {activeJob.status !== 'running' && ` (${activeJob.failed} failed)`}
                </span>
                {activeJob.currentFile && activeJob.status === 'running' && (
                  <span className="job-banner-current-file">Processing: {activeJob.currentFile}</span>
                )}
                {activeJob.status !== 'running' && (
                  <button className="job-banner-close-btn" onClick={dismissJobBanner} title="Dismiss notification">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Full-width Stats Card Row */}
          <div className="knowledge-stats-row">
            <VectorStats storageCapacity={storageSize} mdFileCount={mdFileCount} totalVectors={totalVectors} />
          </div>

          {/* Full-width Explorer Card Row */}
          <div className="knowledge-explorer-row">
            <ConnectorList
              rebuildTriggered={rebuildTriggered}
              onContentsChanged={fetchStorageSize}
            />
          </div>

          {/* Bottom Full-width Insights Row */}
          <div className="knowledge-insight-row">
            <OptimizationInsight />
          </div>

        </div>
      </main>

      {showVectorizeModal && (
        <VectorizeModal
          onClose={() => setShowVectorizeModal(false)}
          onComplete={handleVectorizeComplete}
        />
      )}
    </div>
  );
}

export default KnowledgeBase;
