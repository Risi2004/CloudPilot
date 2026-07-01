import React from 'react';
import { formatConfidence, complexityLabel } from '../../services/platformSelection';
import './RecommendationPanel.css';

function RecommendationPanel({ recommendation, platformsEvaluated }) {
  if (!recommendation) return null;

  const {
    primary_platform: primaryPlatform,
    alternatives,
    hybrid_deployment: hybrid,
    required_services: services,
    deployment_complexity: complexity,
    configuration_steps: configSteps,
    build_commands: buildCommands,
    runtime_requirements: runtimeReqs,
    environment_variables: envVars,
    limitations,
    expected_costs: costs,
    confidence_score: confidence,
    explanation,
    citations,
    documentation_gaps: gaps,
  } = recommendation;

  return (
    <div className="ps-recommendation-panel">
      <div className="ps-rec-header">
        <div>
          <span className="ps-agent-badge font-mono">RECOMMENDATION</span>
          <h2 className="ps-rec-title">{primaryPlatform}</h2>
          <p className="ps-rec-platforms-evaluated">
            Evaluated: {platformsEvaluated?.join(', ') || '—'}
          </p>
        </div>
        <div className="ps-rec-score-badge">
          <span className="ps-rec-score-num">{formatConfidence(confidence)}</span>
          <span className="ps-rec-score-label">CONFIDENCE</span>
        </div>
      </div>

      <div className="ps-rec-meta-row">
        <div className="ps-rec-meta-item">
          <span className="ps-rec-meta-label">Complexity</span>
          <span className="ps-rec-meta-val">{complexityLabel(complexity)}</span>
        </div>
        {hybrid?.recommended && (
          <div className="ps-rec-meta-item">
            <span className="ps-rec-meta-label">Strategy</span>
            <span className="ps-rec-meta-val">Hybrid Deployment</span>
          </div>
        )}
      </div>

      <section className="ps-rec-section">
        <h3>Explanation</h3>
        <p className="ps-rec-explanation">{explanation}</p>
      </section>

      {hybrid?.recommended && hybrid.components?.length > 0 && (
        <section className="ps-rec-section">
          <h3>Hybrid Deployment</h3>
          <p>{hybrid.description}</p>
          <ul className="ps-rec-list">
            {hybrid.components.map((comp, idx) => (
              <li key={idx}>
                <strong>{comp.platform}</strong> ({comp.role}): {comp.reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      {alternatives?.length > 0 && (
        <section className="ps-rec-section">
          <h3>Alternative Platforms</h3>
          <div className="ps-alt-grid">
            {alternatives.map((alt) => (
              <div key={alt.platform} className="ps-alt-card">
                <div className="ps-alt-header">
                  <span className="ps-alt-name">{alt.platform}</span>
                  <span className="ps-alt-score">{formatConfidence(alt.fit_score)} fit</span>
                </div>
                <p className="ps-alt-summary">{alt.summary}</p>
                {alt.pros?.length > 0 && (
                  <ul className="ps-rec-pros">
                    {alt.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                  </ul>
                )}
                {alt.cons?.length > 0 && (
                  <ul className="ps-rec-cons">
                    {alt.cons.map((con, i) => <li key={i}>{con}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="ps-rec-details-grid">
        {services?.length > 0 && (
          <section className="ps-rec-section">
            <h3>Required Services</h3>
            <ul className="ps-rec-list">{services.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </section>
        )}
        {configSteps?.length > 0 && (
          <section className="ps-rec-section">
            <h3>Configuration Steps</h3>
            <ol className="ps-rec-list ordered">{configSteps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          </section>
        )}
        {buildCommands?.length > 0 && (
          <section className="ps-rec-section">
            <h3>Build Commands</h3>
            <ul className="ps-rec-code-list">
              {buildCommands.map((cmd, i) => <li key={i}><code>{cmd}</code></li>)}
            </ul>
          </section>
        )}
        {runtimeReqs?.length > 0 && (
          <section className="ps-rec-section">
            <h3>Runtime Requirements</h3>
            <ul className="ps-rec-list">{runtimeReqs.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </section>
        )}
        {envVars?.length > 0 && (
          <section className="ps-rec-section">
            <h3>Environment Variables</h3>
            <ul className="ps-rec-code-list">
              {envVars.map((v, i) => <li key={i}><code>{v}</code></li>)}
            </ul>
          </section>
        )}
        {limitations?.length > 0 && (
          <section className="ps-rec-section">
            <h3>Limitations</h3>
            <ul className="ps-rec-cons">{limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </section>
        )}
      </div>

      {costs && (
        <section className="ps-rec-section ps-cost-section">
          <h3>Expected Costs</h3>
          <p>{costs.summary}</p>
          {costs.estimate_range && <p className="ps-cost-range">{costs.estimate_range}</p>}
          {costs.notes?.map((note, i) => <p key={i} className="ps-cost-note">{note}</p>)}
          {!costs.grounded_in_documentation && (
            <p className="ps-doc-warning">Cost data may not be fully grounded in documentation.</p>
          )}
        </section>
      )}

      {citations?.length > 0 && (
        <section className="ps-rec-section">
          <h3>Documentation Citations</h3>
          <div className="ps-citations">
            {citations.map((cite, idx) => (
              <div key={idx} className="ps-citation-card">
                <span className="ps-cite-platform">{cite.platform}</span>
                <span className="ps-cite-heading">{cite.heading}</span>
                <span className="ps-cite-path">{cite.relative_path}</span>
                <p className="ps-cite-excerpt">{cite.excerpt}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {gaps?.length > 0 && (
        <section className="ps-rec-section ps-gaps-section">
          <h3>Documentation Gaps</h3>
          <ul className="ps-rec-cons">
            {gaps.map((gap, i) => <li key={i}>{gap}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

export default RecommendationPanel;
