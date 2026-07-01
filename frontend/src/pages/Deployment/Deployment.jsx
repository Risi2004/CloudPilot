import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import DeploymentSummaryPanel from '../../components/Deployment/DeploymentSummaryPanel';
import DeploymentInputsForm from '../../components/Deployment/DeploymentInputsForm';
import DeploymentProgress from '../../components/Deployment/DeploymentProgress';
import DeploymentReportPanel from '../../components/Deployment/DeploymentReportPanel';
import FailureAnalysisPanel from '../../components/Deployment/FailureAnalysisPanel';
import { deploymentStep } from '../../services/deployment';
import { connectGitHub, getGitHubStatus } from '../../services/github';
import './Deployment.css';

function Deployment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const repoUrl = searchParams.get('url');
  const architectureSessionId = searchParams.get('architectureSessionId');

  const [phase, setPhase] = useState('loading');
  const [error, setError] = useState(null);
  const [deploymentSessionId, setDeploymentSessionId] = useState(null);
  const [status, setStatus] = useState('preparing');
  const [missingInputs, setMissingInputs] = useState([]);
  const [deploymentSummary, setDeploymentSummary] = useState(null);
  const [progress, setProgress] = useState(null);
  const [report, setReport] = useState(null);
  const [failureAnalysis, setFailureAnalysis] = useState(null);
  const [validationIssues, setValidationIssues] = useState([]);

  const [branch, setBranch] = useState('main');
  const [credentials, setCredentials] = useState({});
  const [envVars, setEnvVars] = useState({});
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const pollRef = useRef(null);

  const applyResult = useCallback((result) => {
    if (result.deployment_session_id) {
      setDeploymentSessionId(result.deployment_session_id);
    }
    setStatus(result.status);
    setMissingInputs(result.missing_inputs || []);
    setDeploymentSummary(result.deployment_summary || null);
    setProgress(result.progress || null);
    setReport(result.report || null);
    setFailureAnalysis(result.failure_analysis || null);
    setValidationIssues(result.validation_issues || []);
    if (result.branch) setBranch(result.branch);

    if (result.status === 'needs_input') {
      setPhase('needs-input');
    } else if (result.status === 'awaiting_confirmation') {
      setPhase('summary');
    } else if (result.status === 'deploying') {
      setPhase('deploying');
    } else if (result.status === 'complete') {
      setPhase('complete');
    } else if (result.status === 'failed') {
      setPhase('failed');
    }
  }, []);

  const runStep = useCallback(async ({
    action,
    confirmed = false,
    sessionId = deploymentSessionId,
  }) => {
    const credPayload = {};
    if (credentials.vercel_token) credPayload.vercel_token = credentials.vercel_token;
    if (credentials.render_api_key) credPayload.render_api_key = credentials.render_api_key;

    return deploymentStep({
      architectureSessionId,
      deploymentSessionId: sessionId,
      action,
      branch,
      credentials: credPayload,
      envVars,
      saveCredentials,
      confirmed,
    });
  }, [architectureSessionId, deploymentSessionId, branch, credentials, envVars, saveCredentials]);

  useEffect(() => {
    if (!architectureSessionId) {
      setPhase('missing-sessions');
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      setPhase('loading');
      setError(null);

      try {
        const githubStatus = await getGitHubStatus();
        if (!githubStatus.connected) {
          if (!cancelled) setPhase('github-required');
          return;
        }

        const result = await runStep({ action: 'prepare' });
        if (!cancelled) applyResult(result);
      } catch (err) {
        if (!cancelled) {
          if (err.code === 'github_required') {
            setPhase('github-required');
          } else {
            setError(err.message || 'Deployment preparation failed.');
            setPhase('error');
          }
        }
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [architectureSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'deploying') {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return undefined;
    }

    pollRef.current = setInterval(async () => {
      try {
        const result = await runStep({ action: 'poll' });
        applyResult(result);
      } catch (err) {
        setError(err.message || 'Failed to poll deployment status.');
      }
    }, 4000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [phase, runStep, applyResult]);

  const handleProvideInputs = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await runStep({ action: 'provide_inputs' });
      applyResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeploy = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await runStep({ action: 'execute', confirmed: true });
      applyResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyzeFailure = async () => {
    setIsAnalyzing(true);
    try {
      const result = await runStep({ action: 'analyze_failure' });
      applyResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetry = async () => {
    setIsSubmitting(true);
    setFailureAnalysis(null);
    try {
      const result = await runStep({ action: 'retry' });
      applyResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildArchitectureUrl = () => {
    const params = new URLSearchParams();
    if (repoUrl) params.set('url', repoUrl);
    if (searchParams.get('analysisSessionId')) params.set('analysisSessionId', searchParams.get('analysisSessionId'));
    if (searchParams.get('platformSelectionSessionId')) {
      params.set('platformSelectionSessionId', searchParams.get('platformSelectionSessionId'));
    }
    if (architectureSessionId) params.set('architectureSessionId', architectureSessionId);
    return `/architecture-recommendation?${params.toString()}`;
  };

  return (
    <DashboardLayout>
      <div className="deploy-page-wrapper">
        <div className="deploy-page-header">
          <button type="button" className="deploy-back-btn" onClick={() => navigate(buildArchitectureUrl())}>
            ← Back to Architecture
          </button>
          <h1 className="deploy-page-title">Deployment Agent</h1>
          {repoUrl && <p className="deploy-repo-url">{repoUrl}</p>}
        </div>

        {phase === 'loading' && (
          <div className="deploy-loading">
            <div className="deploy-spinner" />
            <p>Validating deployment blueprint…</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="deploy-error-card">
            <h2>Deployment Error</h2>
            <p>{error}</p>
          </div>
        )}

        {phase === 'missing-sessions' && (
          <div className="deploy-error-card">
            <h2>Architecture Session Required</h2>
            <p>Generate a deployment blueprint before starting deployment.</p>
            <button type="button" className="deploy-submit-btn" onClick={() => navigate('/architecture-recommendation')}>
              Go to Architecture
            </button>
          </div>
        )}

        {phase === 'github-required' && (
          <div className="deploy-error-card">
            <h2>GitHub Connection Required</h2>
            <p>Connect your GitHub account to validate repository access and link deployments.</p>
            <button type="button" className="deploy-confirm-btn" onClick={connectGitHub}>
              Connect GitHub
            </button>
          </div>
        )}

        {validationIssues.length > 0 && phase !== 'loading' && (
          <div className="deploy-validation-issues">
            <h3>Validation Issues</h3>
            <ul>
              {validationIssues.map((issue) => (
                <li key={`${issue.code}-${issue.message}`} className={`deploy-issue-${issue.severity}`}>
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && phase !== 'error' && (
          <div className="deploy-inline-error">{error}</div>
        )}

        {phase === 'needs-input' && (
          <DeploymentInputsForm
            missingInputs={missingInputs}
            branch={branch}
            onBranchChange={setBranch}
            credentials={credentials}
            onCredentialChange={(name, value) => setCredentials((prev) => ({ ...prev, [name]: value }))}
            envVars={envVars}
            onEnvVarChange={(name, value) => setEnvVars((prev) => ({ ...prev, [name]: value }))}
            saveCredentials={saveCredentials}
            onSaveCredentialsChange={setSaveCredentials}
            onSubmit={handleProvideInputs}
            isSubmitting={isSubmitting}
          />
        )}

        {phase === 'summary' && (
          <DeploymentSummaryPanel
            summary={deploymentSummary}
            onConfirm={handleConfirmDeploy}
            isSubmitting={isSubmitting}
          />
        )}

        {(phase === 'deploying' || phase === 'failed') && (
          <DeploymentProgress progress={progress} />
        )}

        {phase === 'failed' && (
          <FailureAnalysisPanel
            analysis={failureAnalysis}
            onAnalyze={handleAnalyzeFailure}
            onRetry={handleRetry}
            isAnalyzing={isAnalyzing}
          />
        )}

        {phase === 'complete' && (
          <>
            <DeploymentReportPanel report={report} />
            {progress && <DeploymentProgress progress={progress} />}
          </>
        )}

        {deploymentSessionId && (
          <p className="deploy-session-id">Session: {deploymentSessionId.slice(0, 8)}… · Status: {status}</p>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Deployment;
