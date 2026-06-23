import React, { useState, useEffect } from 'react';
import './KnowledgeBase.css';

// Layout and widgets
import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import VectorStats from '../../../components/Admin/KnowledgeBase/VectorStats';
import ConnectorList from '../../../components/Admin/KnowledgeBase/ConnectorList';
import OptimizationInsight from '../../../components/Admin/KnowledgeBase/OptimizationInsight';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function KnowledgeBase() {
  const [rebuildTriggered, setRebuildTriggered] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [storageSize, setStorageSize] = useState('-');
  const [mdFileCount, setMdFileCount] = useState('-');

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

  useEffect(() => {
    fetchStorageSize();
  }, [rebuildTriggered]);

  const handleRebuildDB = () => {
    if (isRebuilding) return;

    setIsRebuilding(true);
    // Simulate vector rebuilding process
    setTimeout(() => {
      setIsRebuilding(false);
      setRebuildTriggered(true);
      alert('Vector Database rebuilt successfully!\nPruned 14 redundant chunks.\nTerraform Connector synchronized.');
    }, 2000);
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
                disabled={isRebuilding}
              >
                {isRebuilding ? (
                  <span className="rebuilding-spinner-text">
                    <svg className="kb-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <circle cx="12" cy="12" r="10" strokeDasharray="40 20" strokeLinecap="round" />
                    </svg>
                    Rebuilding...
                  </span>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    Rebuild Vector DB
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Full-width Stats Card Row */}
          <div className="knowledge-stats-row">
            <VectorStats storageCapacity={storageSize} mdFileCount={mdFileCount} />
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
    </div>
  );
}

export default KnowledgeBase;
