import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import PlatformCredentialsPanel from '../../components/DeploymentAgent/PlatformCredentialsPanel';
import DeploymentPlanReview from '../../components/DeploymentAgent/DeploymentPlanReview';
import DeploymentPipelineView from '../../components/DeploymentAgent/DeploymentPipelineView';
import DeploymentVerificationPanel from '../../components/DeploymentAgent/DeploymentVerificationPanel';
import DeploymentTroubleshootingPanel from '../../components/DeploymentAgent/DeploymentTroubleshootingPanel';
import './DeploymentAgent.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const ACTIVE_STATUSES = new Set(['running', 'stopping']);

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function parseOrThrow(res) {
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(payload.message || 'Request failed.');
    err.status = res.status;
    throw err;
  }
  return payload;
}

function DeploymentAgent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const repoUrl = searchParams.get('url');
  const architectureOptionId = searchParams.get('optionId');

  const [loading, setLoading] = useState(true);
  const [gatingError, setGatingError] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [plan, setPlan] = useState(null);
  const [deployment, setDeployment] = useState(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const [optionStale, setOptionStale] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  const pollRef = useRef(null);

  const loadCredentials = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/credentials`, { headers: authHeaders() });
    const payload = await parseOrThrow(res);
    setCredentials(payload.credentials || []);
  }, []);

  const fetchDeployment = useCallback(async (deploymentId) => {
    const res = await fetch(`${API_URL}/api/deployment/${deploymentId}`, { headers: authHeaders() });
    const payload = await parseOrThrow(res);
    setDeployment(payload.deployment);
    return payload.deployment;
  }, []);

  const init = useCallback(async () => {
    if (!repoUrl || !architectureOptionId) return;
    setLoading(true);
    setGatingError(null);
    setOptionStale(false);
    try {
      await loadCredentials();

      const historyRes = await fetch(`${API_URL}/api/deployment?repoUrl=${encodeURIComponent(repoUrl)}`, {
        headers: authHeaders(),
      });
      const historyPayload = await parseOrThrow(historyRes);
      const existing = (historyPayload.deployments || []).find((d) => d.architectureOptionId === architectureOptionId);

      if (existing && ACTIVE_STATUSES.has(existing.status)) {
        setDeployment(existing);
        setLoading(false);
        return;
      }
      if (existing && (existing.status === 'succeeded' || existing.status === 'stopped' || existing.status === 'failed')) {
        setDeployment(existing);
      }

      const planRes = await fetch(`${API_URL}/api/deployment/plan`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ repoUrl, architectureOptionId }),
      });
      const planPayload = await parseOrThrow(planRes);
      setPlan(planPayload.plan);
    } catch (err) {
      console.error(err);
      if (/unknown architecture option/i.test(err.message)) {
        setOptionStale(true);
      } else {
        setGatingError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [repoUrl, architectureOptionId, loadCredentials]);

  useEffect(() => {
    setDeployment(null);
    setPlan(null);
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoUrl, architectureOptionId]);

  const deploymentId = deployment ? deployment.id : null;
  const deploymentStatus = deployment ? deployment.status : null;

  useEffect(() => {
    if (deploymentId && ACTIVE_STATUSES.has(deploymentStatus)) {
      pollRef.current = setInterval(() => {
        fetchDeployment(deploymentId).catch((err) => console.error(err));
      }, 2500);
      return () => clearInterval(pollRef.current);
    }
    return undefined;
  }, [deploymentId, deploymentStatus, fetchDeployment]);

  const handleConnect = async (platform, apiKey) => {
    const res = await fetch(`${API_URL}/api/credentials`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ platform, apiKey }),
    });
    await parseOrThrow(res);
    await loadCredentials();
  };

  const handleRemove = async (platform) => {
    await fetch(`${API_URL}/api/credentials/${platform}`, { method: 'DELETE', headers: authHeaders() });
    await loadCredentials();
  };

  const handleStart = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch(`${API_URL}/api/deployment/start`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ repoUrl, architectureOptionId, plan }),
      });
      const payload = await parseOrThrow(res);
      await fetchDeployment(payload.deploymentId);
    } catch (err) {
      if (/unknown architecture option/i.test(err.message)) {
        setOptionStale(true);
      } else {
        setStartError(err.message);
      }
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await fetch(`${API_URL}/api/deployment/${deployment.id}/stop`, { method: 'POST', headers: authHeaders() });
      await fetchDeployment(deployment.id);
    } catch (err) {
      console.error(err);
    } finally {
      setStopping(false);
    }
  };

  const handleRollback = async () => {
    setRollingBack(true);
    try {
      await fetch(`${API_URL}/api/deployment/${deployment.id}/rollback`, { method: 'POST', headers: authHeaders() });
      await fetchDeployment(deployment.id);
    } catch (err) {
      console.error(err);
    } finally {
      setRollingBack(false);
    }
  };

  const handleUpdateEnvVars = async (componentName, envVars) => {
    const res = await fetch(`${API_URL}/api/deployment/${deployment.id}/env`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ componentName, envVars }),
    });
    await parseOrThrow(res);
    await fetchDeployment(deployment.id);
  };

  const requiredPlatforms = plan ? [...new Set(plan.components.filter((c) => c.deployable).map((c) => c.platform))] : [];
  const connectedPlatforms = new Set(credentials.map((c) => c.platform));
  const allConnected = requiredPlatforms.every((p) => connectedPlatforms.has(p));
  const canRetry = deployment && (deployment.status === 'failed' || deployment.status === 'stopped') && plan;

  return (
    <DashboardLayout>
      <div className="da-page-wrapper">
        {!repoUrl || !architectureOptionId ? (
          <div className="da-empty-container">
            <div className="da-empty-card">
              <h2 className="da-empty-title">Deployment Agent</h2>
              <p className="da-empty-desc">No repository or architecture option selected. Start from Architecture Recommendation.</p>
              <button type="button" className="da-go-back-btn" onClick={() => navigate('/repositories')}>
                Go to Repository Analysis
              </button>
            </div>
          </div>
        ) : (
          <div className="da-content-container">
            <button
              type="button"
              className="da-back-btn"
              onClick={() => navigate(`/architecture-recommendation?url=${encodeURIComponent(repoUrl)}`)}
            >
              ← Back to Architecture Options
            </button>

            <div className="da-header">
              <h1 className="da-header-title">Deployment Agent</h1>
              <p className="da-header-repo font-mono">{repoUrl}</p>
            </div>

            {loading && (
              <div className="da-loading-state">
                <div className="da-loading-spinner"></div>
                <span>Preparing your deployment plan...</span>
              </div>
            )}

            {!loading && gatingError && <div className="da-error-banner">{gatingError}</div>}

            {!loading && optionStale && (
              <div className="da-stale-option-banner">
                <p>
                  This architecture option is no longer available - the options for this repository were regenerated
                  since you opened this page, so their IDs changed. Go back and pick one of the current options.
                </p>
                <button
                  type="button"
                  className="da-go-back-btn"
                  onClick={() => navigate(`/architecture-recommendation?url=${encodeURIComponent(repoUrl)}`)}
                >
                  Choose an Architecture Option
                </button>
              </div>
            )}

            {!loading && !gatingError && !optionStale && deployment && (deployment.status === 'succeeded' || ACTIVE_STATUSES.has(deployment.status) || deployment.status === 'failed' || deployment.status === 'stopped') && (
              <DeploymentPipelineView
                deployment={deployment}
                onStop={handleStop}
                stopping={stopping}
                onRollback={handleRollback}
                rollingBack={rollingBack}
                onUpdateEnvVars={handleUpdateEnvVars}
              />
            )}

            {!loading && !gatingError && deployment && deployment.status === 'succeeded' && (
              <DeploymentVerificationPanel deploymentId={deployment.id} />
            )}

            {!loading && !gatingError && deployment && deployment.status === 'failed' && (
              <DeploymentTroubleshootingPanel deploymentId={deployment.id} />
            )}

            {!loading && !gatingError && canRetry && (
              <button type="button" className="da-retry-btn" onClick={() => setDeployment(null)}>
                Start a New Deployment Attempt
              </button>
            )}

            {!loading && !gatingError && !deployment && plan && !allConnected && (
              <PlatformCredentialsPanel
                requiredPlatforms={requiredPlatforms}
                credentials={credentials}
                onConnect={handleConnect}
                onRemove={handleRemove}
              />
            )}

            {!loading && !gatingError && !deployment && plan && allConnected && (
              <DeploymentPlanReview plan={plan} onChange={setPlan} onStart={handleStart} starting={starting} error={startError} />
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default DeploymentAgent;
