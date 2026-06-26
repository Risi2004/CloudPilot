import React from 'react';
import { displayNarrativeText, formatScannedAt } from '../../services/repositoryAnalysis';

function NarrativeCard({ title, content }) {
  const text = displayNarrativeText(content);
  return (
    <div className="narrative-card">
      <h4 className="section-sub-title">{title}</h4>
      <p className="narrative-body">{text || '—'}</p>
    </div>
  );
}

function BulletList({ title, items }) {
  return (
    <div className="analysis-list-card">
      <h4 className="section-sub-title">{title}</h4>
      <ul className="analysis-bullet-list">
        {items?.length
          ? items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)
          : <li className="muted">None reported</li>}
      </ul>
    </div>
  );
}

function TabAnalysisOverview({ result }) {
  const { analysis, source } = result;

  const sections = [
    { title: 'Project Overview', content: analysis.project_overview },
    { title: 'Technology Stack', content: analysis.technology_stack_summary },
    { title: 'Architecture', content: analysis.architecture_summary },
    { title: 'Deployment Readiness', content: analysis.deployment_readiness },
    { title: 'Recommended Strategy', content: analysis.recommended_deployment_strategy },
  ];

  return (
    <div className="tab-pane-content">
      <div className="tab-pane-header">
        <h3 className="tab-pane-title">AI Analysis Narrative</h3>
        <p className="tab-pane-subtitle">
          Generated from scan facts with automatic fallbacks when AI fields are empty.
          Source: {source?.input || '—'} · scanned {formatScannedAt(source)}
          {source?.clone_method ? ` · clone: ${source.clone_method}` : ''}
        </p>
      </div>

      <div className="analysis-narrative-grid">
        {sections.map((section) => (
          <NarrativeCard key={section.title} title={section.title} content={section.content} />
        ))}
      </div>

      <div className="analysis-list-columns">
        <BulletList title="Missing Configuration Files" items={analysis.missing_configuration_files} />
        <BulletList title="Potential Deployment Issues" items={analysis.potential_deployment_issues} />
        <BulletList title="Risks Before Deployment" items={analysis.risks_before_deployment} />
      </div>
    </div>
  );
}

export default TabAnalysisOverview;
