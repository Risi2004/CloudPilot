import React, { useState } from 'react';
import './KnowledgeBase.css';

// Layout and widgets
import AdminSidebar from '../../../components/Admin/AdminDashboard/AdminSidebar';
import VectorStats from '../../../components/Admin/KnowledgeBase/VectorStats';
import ConnectorList from '../../../components/Admin/KnowledgeBase/ConnectorList';
import IndexedDocs from '../../../components/Admin/KnowledgeBase/IndexedDocs';
import OptimizationInsight from '../../../components/Admin/KnowledgeBase/OptimizationInsight';

function KnowledgeBase() {
  const [vectorsCount, setVectorsCount] = useState(1248302);
  const [rebuildTriggered, setRebuildTriggered] = useState(false);
  const [uploadTrigger, setUploadTrigger] = useState(null);
  const [isRebuilding, setIsRebuilding] = useState(false);

  const handleRebuildDB = () => {
    if (isRebuilding) return;

    setIsRebuilding(true);
    // Simulate vector rebuilding process
    setTimeout(() => {
      setIsRebuilding(false);
      setRebuildTriggered(true);
      setVectorsCount(1248446); // Incremented vectors count
      alert('Vector Database rebuilt successfully!\nPruned 14 redundant chunks.\nTerraform Connector synchronized.');
    }, 2000);
  };

  const handleUploadDocs = () => {
    const fileName = prompt('Enter the name of the document to index (e.g. cluster-specs.yaml):');
    if (!fileName) return;

    const fileExt = fileName.split('.').pop().toLowerCase();
    const typeMap = {
      pdf: 'pdf',
      md: 'doc',
      txt: 'doc',
      json: 'code',
      yaml: 'code',
      yml: 'code',
      tf: 'code'
    };

    setUploadTrigger({
      name: fileName,
      size: `${Math.floor(Math.random() * 500) + 12} KB`,
      fileType: typeMap[fileExt] || 'pdf'
    });
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
              {/* Upload Docs trigger */}
              <button className="kb-action-btn secondary" onClick={handleUploadDocs}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="btn-icon">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload Docs
              </button>
              
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

          {/* Left / Right columns split layout */}
          <div className="knowledge-layout-split">
            {/* Left narrow column: Connectors */}
            <div className="knowledge-left-column">
              <ConnectorList rebuildTriggered={rebuildTriggered} />
            </div>

            {/* Right wide column: Stats, docs database, and optimization callouts */}
            <div className="knowledge-right-column">
              <VectorStats vectorsCount={vectorsCount} />
              
              <div className="right-col-docs-row">
                <IndexedDocs uploadTrigger={uploadTrigger} />
              </div>

              <div className="right-col-insight-row">
                <OptimizationInsight />
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default KnowledgeBase;
