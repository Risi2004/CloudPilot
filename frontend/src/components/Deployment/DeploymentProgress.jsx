import React, { useState, useEffect, useRef } from 'react';
import './DeploymentProgress.css';

const steps = [
  { id: 'init', label: '1. Initializing Agent', thoughts: 'Initializing deployment session and checking credentials...' },
  { id: 'repo', label: '2. Checking Git Access', thoughts: 'Testing repository access rights and resolving branches...' },
  { id: 'validate', label: '3. Validating Blueprint', thoughts: 'Analyzing static build commands, env requirements, and targets...' },
  { id: 'provision', label: '4. Provisioning Project', thoughts: 'Provisioning project slot and resources on Render/Vercel...' },
  { id: 'env', label: '5. Setting Env Variables', thoughts: 'Writing secret tokens and environment configurations...' },
  { id: 'trigger', label: '6. Triggering Deploy Job', thoughts: 'Triggering remote compilation and deployment pipeline...' },
  { id: 'poll', label: '7. Polling Build Status', thoughts: 'Polling project build logs and waiting for deployment state to become active...' },
  { id: 'finalize', label: '8. Finalizing Deployment', thoughts: 'Verifying service URLs and completing session deployment!' }
];

const MouseCursor = () => (
  <svg
    className="agent-mouse-icon"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5.65376 12.3825L19.5 5.5L12.6175 19.3462L10.5925 13.7913L5.65376 12.3825Z"
      fill="#00d4ff"
      stroke="#030712"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function DeploymentProgress({ progress }) {
  const [expandedService, setExpandedService] = useState(null);
  const [cursorCoords, setCursorCoords] = useState({ x: -100, y: -100 });
  const [showClick, setShowClick] = useState(false);
  const [thought, setThought] = useState('');

  const containerRef = useRef(null);
  const stepRefs = useRef([]);

  const getActiveStepIndex = (prog) => {
    if (!prog) return 0;
    const stage = (prog.current_stage || '').toLowerCase();
    const overall = (prog.overall_status || '').toLowerCase();

    if (overall === 'complete') return 7;

    // Prefer concrete service state over vague overall "deploying"/"failed"
    // status so a failure mid-build is shown at the step it actually failed
    // on, rather than being reported as having reached the final step.
    if (prog.services && prog.services.length > 0) {
      const first = prog.services[0];
      const serviceStage = (first.stage || '').toLowerCase();
      const deployStatus = (first.deploy_status || '').toLowerCase();
      if (!first.provider_resource_id && (deployStatus === 'pending' || serviceStage === 'pending')) {
        return 3;
      }
      if (serviceStage.includes('config')) return 4;
      if (deployStatus === 'deploying' || serviceStage.includes('build') || serviceStage.includes('monitor')) {
        return 6;
      }
      if (deployStatus === 'live') return 7;
      if (serviceStage.includes('provision')) return 3;
      if (overall === 'failed') return 6;
    }

    if (overall === 'failed') return 6;
    if (stage.includes('poll') || stage.includes('build') || stage.includes('monitor')) {
      return 6;
    }
    if (stage.includes('trigger')) {
      return 5;
    }
    if (stage.includes('env') || stage.includes('config')) {
      return 4;
    }
    if (stage.includes('provision') || stage.includes('project')) {
      return 3;
    }
    if (stage.includes('validate') || stage.includes('credential')) {
      return 2;
    }
    if (stage.includes('repo') || stage.includes('branch') || stage.includes('access')) {
      return 1;
    }
    if (stage.includes('init') || stage.includes('prepare')) {
      return 0;
    }
    if (stage.includes('deploy')) {
      return 6;
    }

    return 0;
  };

  const isFailed = (progress?.overall_status || '').toLowerCase() === 'failed';

  useEffect(() => {
    const updatePosition = () => {
      const activeIdx = getActiveStepIndex(progress);
      const targetEl = stepRefs.current[activeIdx];
      const containerEl = containerRef.current;

      if (targetEl && containerEl) {
        const targetRect = targetEl.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();

        // Hover slightly to the left side of the text row
        const x = targetRect.left - containerRect.left + 5;
        const y = targetRect.top - containerRect.top + targetRect.height / 2;

        setCursorCoords({ x, y });
        setThought(steps[activeIdx]?.thoughts || '');

        // Trigger brief click animation wave on landing
        setShowClick(false);
        const timer = setTimeout(() => {
          setShowClick(true);
        }, 850);

        return () => clearTimeout(timer);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [progress]);

  if (!progress) return null;

  const services = progress.services || [];

  return (
    <div className="deploy-progress-container" ref={containerRef}>
      <section className="deploy-progress-panel">
        <h2 className="deploy-section-title">Deployment Progress</h2>
        <div className="deploy-progress-header">
          <span className={`deploy-status-badge deploy-status-${progress.overall_status}`}>
            {progress.overall_status}
          </span>
          <span className="deploy-stage-label">Stage: {progress.current_stage}</span>
        </div>

        <div className="deploy-progress-bar">
          <div
            className={`deploy-progress-fill deploy-progress-${progress.overall_status}`}
            style={{
              width: progress.overall_status === 'complete' ? '100%' : progress.overall_status === 'failed' ? '100%' : '60%',
            }}
          />
        </div>

        <div className="deploy-service-cards">
          {services.map((service) => (
            <div key={service.service_id} className="deploy-service-card">
              <div className="deploy-service-card-header">
                <div>
                  <strong>{service.name || service.service_id}</strong>
                  <span className="deploy-service-platform">{service.platform}</span>
                </div>
                <span className={`deploy-status-badge deploy-status-${service.deploy_status}`}>
                  {service.deploy_status}
                </span>
              </div>
              <div className="deploy-service-meta-row">
                <span>Build: {service.build_status}</span>
                <span>Stage: {service.stage}</span>
              </div>
              {service.url && (
                <a href={service.url} target="_blank" rel="noreferrer" className="deploy-service-url">
                  {service.url}
                </a>
              )}
              {service.error && (
                <p className="deploy-service-error">{service.error}</p>
              )}
              {service.logs_excerpt && (
                <>
                  <button
                    type="button"
                    className="deploy-logs-toggle"
                    onClick={() => setExpandedService(
                      expandedService === service.service_id ? null : service.service_id,
                    )}
                  >
                    {expandedService === service.service_id ? 'Hide Logs' : 'Show Logs'}
                  </button>
                  {expandedService === service.service_id && (
                    <pre className="deploy-logs">{service.logs_excerpt}</pre>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Side tracker with steps and glide virtual cursor */}
      <aside className="agent-steps-panel">
        <h3 className="agent-steps-title">
          <span className="agent-pulse-badge"></span>
          Agent Actions Tracker
        </h3>
        <div className="agent-steps-list">
          {steps.map((step, idx) => {
            const activeIdx = getActiveStepIndex(progress);
            const isErrored = idx === activeIdx && isFailed;
            const isActive = idx === activeIdx && !isFailed;
            const isCompleted = idx < activeIdx;
            const isPending = idx > activeIdx;

            return (
              <div
                key={step.id}
                ref={(el) => { stepRefs.current[idx] = el; }}
                className={`agent-step-item ${isActive ? 'active' : ''} ${isErrored ? 'errored' : ''} ${isCompleted ? 'completed' : ''} ${isPending ? 'pending' : ''}`}
              >
                <div className="agent-step-status-icon">
                  {isCompleted && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: '#10b981' }}>
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                  {isActive && <div className="agent-step-spinner" />}
                  {isErrored && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: '#ef4444' }}>
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  )}
                  {isPending && <span style={{ color: '#475569' }}>•</span>}
                </div>
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Floating Virtual Mouse Cursor */}
      <div
        className="agent-cursor-wrapper"
        style={{
          left: `${cursorCoords.x}px`,
          top: `${cursorCoords.y}px`,
          transform: 'translate(-4px, -4px)',
        }}
      >
        <MouseCursor />
        {showClick && <div className="agent-click-ripple" />}
        {thought && (
          <div className="agent-thought-bubble">
            <strong>CloudPilot Agent:</strong>
            <div>{thought}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DeploymentProgress;
