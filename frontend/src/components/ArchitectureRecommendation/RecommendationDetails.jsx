import React, { useState } from 'react';
import './RecommendationDetails.css';

function RecommendationDetails({ blueprint }) {
  const [activeDetailTab, setActiveDetailTab] = useState('environment');

  if (!blueprint) {
    return null;
  }

  const renderDetailsContent = () => {
    switch (activeDetailTab) {
      case 'environment':
        return (
          <div className="spec-content-box">
            <h4 className="spec-section-header">ENVIRONMENT VARIABLE PLAN</h4>
            <p className="spec-section-desc">Required environment variables by service scope.</p>
            <div className="spec-rows-list">
              {(blueprint.environment_plan || []).length > 0 ? (
                blueprint.environment_plan.map((item, idx) => (
                  <div key={idx} className="spec-detail-row">
                    <span className="spec-row-key">{item.variable}</span>
                    <span className="spec-row-val font-mono">
                      {item.scope} — {item.service_ids?.join(', ') || 'all'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="spec-section-desc">No environment variables identified.</p>
              )}
            </div>
          </div>
        );
      case 'network':
        return (
          <div className="spec-content-box">
            <h4 className="spec-section-header">NETWORKING DESIGN</h4>
            <p className="spec-section-desc">{blueprint.networking?.domain_structure || 'Network topology for deployed services.'}</p>
            <div className="spec-rows-list">
              {(blueprint.networking?.public_endpoints || []).map((ep, idx) => (
                <div key={idx} className="spec-detail-row">
                  <span className="spec-row-key">Public endpoint</span>
                  <span className="spec-row-val font-mono">{ep}</span>
                </div>
              ))}
              {(blueprint.networking?.internal_endpoints || []).map((ep, idx) => (
                <div key={idx} className="spec-detail-row">
                  <span className="spec-row-key">Internal endpoint</span>
                  <span className="spec-row-val font-mono">{ep}</span>
                </div>
              ))}
              {blueprint.networking?.cors_notes && (
                <div className="spec-detail-row">
                  <span className="spec-row-key">CORS</span>
                  <span className="spec-row-val">{blueprint.networking.cors_notes}</span>
                </div>
              )}
            </div>
          </div>
        );
      case 'scaling':
        return (
          <div className="spec-content-box">
            <h4 className="spec-section-header">SCALING RECOMMENDATIONS</h4>
            <div className="spec-rows-list">
              {(blueprint.scaling_recommendations || []).map((rec, idx) => (
                <div key={idx} className="spec-detail-row">
                  <span className="spec-row-key">{rec.service_id || 'Service'}</span>
                  <span className="spec-row-val">{rec.strategy} — {rec.explanation}</span>
                </div>
              ))}
              {(blueprint.scaling_recommendations || []).length === 0 && (
                <p className="spec-section-desc">No scaling recommendations generated.</p>
              )}
            </div>
          </div>
        );
      case 'risks':
        return (
          <div className="spec-content-box">
            <h4 className="spec-section-header">ARCHITECTURAL RISKS</h4>
            <div className="spec-rows-list">
              {(blueprint.architectural_risks || []).map((risk, idx) => (
                <div key={idx} className="spec-detail-row">
                  <span className="spec-row-key">{risk.severity?.toUpperCase()}</span>
                  <span className="spec-row-val">{risk.risk} — {risk.recommendation}</span>
                </div>
              ))}
              {(blueprint.documentation_gaps || []).map((gap, idx) => (
                <div key={`gap-${idx}`} className="spec-detail-row">
                  <span className="spec-row-key">Doc gap</span>
                  <span className="spec-row-val">{gap}</span>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rec-details-wrapper">
      <div className="details-tabs-header">
        {['environment', 'network', 'scaling', 'risks'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`details-tab-btn ${activeDetailTab === tab ? 'active' : ''}`}
            onClick={() => setActiveDetailTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div className="details-body">{renderDetailsContent()}</div>
    </div>
  );
}

export default RecommendationDetails;
