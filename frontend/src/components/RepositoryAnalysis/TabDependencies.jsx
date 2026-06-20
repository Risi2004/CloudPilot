import React from 'react';

function TabDependencies({ data }) {
  return (
    <div className="tab-pane-content">
      <div className="tab-pane-header">
        <h3 className="tab-pane-title">Runtime & Dependency Manifest</h3>
        <p className="tab-pane-subtitle">Requirements compiled from standard project configuration records.</p>
      </div>

      <div className="runtime-specs-container">
        <div className="runtime-spec-box">
          <span className="spec-label">REQUIRED RUNTIME</span>
          <span className="spec-value">{data.buildRequirements?.runtimeVersion}</span>
        </div>
        <div className="runtime-spec-box">
          <span className="spec-label">BUILD COMMAND</span>
          <span className="spec-value font-mono">`{data.buildRequirements?.buildCommand}`</span>
        </div>
        <div className="runtime-spec-box">
          <span className="spec-label">BOOT COMMAND</span>
          <span className="spec-value font-mono">`{data.buildRequirements?.startCommand}`</span>
        </div>
      </div>

      <div className="dependencies-section-split">
        {/* Dependencies List */}
        <div className="deps-list-wrapper">
          <h4 className="section-sub-title">Package Dependencies ({data.dependencies?.length || 0})</h4>
          <div className="deps-manifest-grid">
            {data.dependencies?.map((dep, index) => (
              <div key={index} className="dep-manifest-card">
                <span className="dep-manifest-name">{dep.name}</span>
                <span className="dep-manifest-ver">{dep.version}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Environment Variables */}
        <div className="env-vars-wrapper">
          <h4 className="section-sub-title">Required Environment Variables</h4>
          <div className="env-vars-list">
            {data.buildRequirements?.envVariables?.map((env, index) => (
              <div key={index} className="env-var-card">
                <span className="env-var-key font-mono">{env.split(' ')[0]}</span>
                <span className="env-var-desc">{env.includes('(') ? env.substring(env.indexOf('(')) : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TabDependencies;
