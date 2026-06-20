import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import './ArchitectureRecommendation.css';

// Subcomponents
import RecommendationHeader from '../../components/ArchitectureRecommendation/RecommendationHeader';
import PlatformCard from '../../components/ArchitectureRecommendation/PlatformCard';
import ArchitectureDiagram from '../../components/ArchitectureRecommendation/ArchitectureDiagram';
import RecommendationDetails from '../../components/ArchitectureRecommendation/RecommendationDetails';

// Helper mock data resolver
import { getAnalysisResult } from '../RepositoryAnalysis/mockData';

function ArchitectureRecommendation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repoUrl = searchParams.get('url');

  const [analysisData, setAnalysisData] = useState(null);

  useEffect(() => {
    if (repoUrl) {
      setAnalysisData(getAnalysisResult(repoUrl));
    } else {
      setAnalysisData(null);
    }
  }, [repoUrl]);

  return (
    <DashboardLayout>
      <div className="rec-page-wrapper">
        {repoUrl ? (
          analysisData && (
            <div className="rec-content-container">
              {/* Back Button */}
              <button 
                type="button" 
                className="rec-back-btn" 
                onClick={() => navigate(`/repository-analysis?url=${encodeURIComponent(repoUrl)}`)}
              >
                ← Back to Repository Analysis
              </button>

              {/* Recommendation Header */}
              <RecommendationHeader repoUrl={repoUrl} />

              <div className="rec-grid-layout">
                {/* Left column: Platform Selection & Details */}
                <div className="rec-left-column">
                  <PlatformCard 
                    platform={analysisData.framework} 
                    provider={analysisData.iac?.provider || 'AWS (Amazon Web Services)'}
                  />

                  <RecommendationDetails />
                </div>

                {/* Right column: Interactive Visual Diagram */}
                <div className="rec-right-column">
                  <ArchitectureDiagram data={analysisData} />
                </div>
              </div>

              {/* Bottom Cost Estimation Banner CTA */}
              <div className="rec-cost-banner-cta">
                <div className="rec-cost-banner-left">
                  <div className="rec-cost-banner-badge font-mono">COST ESTIMATION AGENT</div>
                  <h3 className="rec-cost-banner-title">Curious about the billing estimates for this architecture?</h3>
                  <p className="rec-cost-banner-desc">Our Cost Estimation Agent has calculated the resource-by-resource costs, cheaper alternatives, and multi-provider comparisons.</p>
                </div>
                <button
                  type="button"
                  className="rec-cost-banner-btn"
                  onClick={() => navigate(`/cost-estimation?url=${encodeURIComponent(repoUrl)}`)}
                >
                  View Cost Estimation Report →
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="rec-empty-container">
            <div className="rec-empty-card">
              <h2 className="rec-empty-title">Architecture Recommendations</h2>
              <p className="rec-empty-desc">No repository URL selected. Please perform repository scans first.</p>
              <button 
                type="button" 
                className="rec-go-back-btn" 
                onClick={() => navigate('/repositories')}
              >
                Go to Repository Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default ArchitectureRecommendation;
