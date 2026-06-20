import React from 'react';
import cloudResourcesIcon from '../../assets/cloud-resources.svg';
import frontendInstanceIcon from '../../assets/frontend-instance.svg';
import backendInstanceIcon from '../../assets/backend-instance.svg';
import editIcon from '../../assets/edit.svg';

function CloudResources() {
  return (
    <section>
      <div className="ws-section-header">
        <h2 className="ws-section-title">
          <img src={cloudResourcesIcon} alt="" className="ws-section-title-icon" style={{ width: 16, height: 16, marginRight: 8 }} />
          Cloud Resources
        </h2>
        <button type="button" className="ws-add-resource">
          + Add Resource
        </button>
      </div>

      <div className="ws-resource-cards">
        {/* Frontend Instance */}
        <article className="ws-resource-card">
          <div className="ws-resource-card-header">
            <div className="ws-resource-icon-title">
              <div className="ws-resource-icon">
                <img src={frontendInstanceIcon} alt="" style={{ width: 16, height: 16 }} />
              </div>
              <div>
                <p className="ws-resource-name">Frontend Instance</p>
                <p className="ws-resource-type">AWS Fargate Service</p>
              </div>
            </div>
            <button type="button" className="ws-edit-btn" aria-label="Edit frontend instance">
              <img src={editIcon} alt="Edit" style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div className="ws-resource-specs">
            <span className="ws-spec-chip">1 vCPU</span>
            <span className="ws-spec-chip">1GB RAM</span>
          </div>
        </article>

        {/* Backend Instance */}
        <article className="ws-resource-card">
          <div className="ws-resource-card-header">
            <div className="ws-resource-icon-title">
              <div className="ws-resource-icon">
                <img src={backendInstanceIcon} alt="" style={{ width: 16, height: 16 }} />
              </div>
              <div>
                <p className="ws-resource-name">Backend Instance</p>
                <p className="ws-resource-type">AWS ECS Cluster Node</p>
              </div>
            </div>
            <button type="button" className="ws-edit-btn" aria-label="Edit backend instance">
              <img src={editIcon} alt="Edit" style={{ width: 14, height: 14 }} />
            </button>
          </div>
          <div className="ws-resource-specs">
            <span className="ws-spec-chip">2 vCPU</span>
            <span className="ws-spec-chip">4GB RAM</span>
          </div>
        </article>
      </div>
    </section>
  );
}

export default CloudResources;
