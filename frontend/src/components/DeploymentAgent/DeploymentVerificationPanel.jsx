import React, { useState, useEffect, useCallback, useRef } from 'react';
import VerificationPlanReview from './VerificationPlanReview';
import VerificationChecksView from './VerificationChecksView';
import './DeploymentVerificationPanel.css';

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

function DeploymentVerificationPanel({ deploymentId }) {
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [verification, setVerification] = useState(null);
  const [testPlan, setTestPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const pollRef = useRef(null);

  const fetchVerification = useCallback(async (id) => {
    const res = await fetch(`${API_URL}/api/verification/${id}`, { headers: authHeaders() });
    const payload = await parseOrThrow(res);
    setVerification(payload.verification);
    return payload.verification;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setVerification(null);
    setTestPlan(null);
    setPlanError(null);

    (async () => {
      setLoadingHistory(true);
      try {
        const res = await fetch(`${API_URL}/api/verification?deploymentId=${deploymentId}`, { headers: authHeaders() });
        const payload = await parseOrThrow(res);
        const latest = (payload.verifications || [])[0];
        if (latest && !cancelled) setVerification(latest);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deploymentId]);

  const verificationId = verification ? verification.id : null;
  const verificationStatus = verification ? verification.status : null;

  useEffect(() => {
    if (verificationId && ACTIVE_STATUSES.has(verificationStatus)) {
      pollRef.current = setInterval(() => {
        fetchVerification(verificationId).catch((err) => console.error(err));
      }, 3000);
      return () => clearInterval(pollRef.current);
    }
    return undefined;
  }, [verificationId, verificationStatus, fetchVerification]);

  const handleBeginReview = async () => {
    setLoadingPlan(true);
    setPlanError(null);
    try {
      const githubToken = localStorage.getItem('github_token');
      const res = await fetch(`${API_URL}/api/verification/plan`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ deploymentId, githubToken }),
      });
      const payload = await parseOrThrow(res);
      setTestPlan(payload.testPlan);
    } catch (err) {
      setPlanError(err.message);
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    setPlanError(null);
    try {
      const res = await fetch(`${API_URL}/api/verification/start`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ deploymentId, testPlan }),
      });
      const payload = await parseOrThrow(res);
      await fetchVerification(payload.verificationId);
      setTestPlan(null);
    } catch (err) {
      setPlanError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await fetch(`${API_URL}/api/verification/${verification.id}/stop`, { method: 'POST', headers: authHeaders() });
      await fetchVerification(verification.id);
    } catch (err) {
      console.error(err);
    } finally {
      setStopping(false);
    }
  };

  if (loadingHistory) return null;

  const canRetry = verification && !ACTIVE_STATUSES.has(verification.status);

  return (
    <div className="dvp-wrapper">
      {!verification && !testPlan && (
        <button type="button" className="dvp-verify-btn" disabled={loadingPlan} onClick={handleBeginReview}>
          {loadingPlan ? 'Analyzing your app...' : 'Verify Deployment'}
        </button>
      )}

      {planError && !testPlan && <div className="dvp-error-banner">{planError}</div>}

      {testPlan && !verification && (
        <VerificationPlanReview testPlan={testPlan} onChange={setTestPlan} onStart={handleStart} starting={starting} error={planError} />
      )}

      {verification && (
        <VerificationChecksView verification={verification} onStop={handleStop} stopping={stopping} />
      )}

      {canRetry && (
        <button type="button" className="dvp-retry-btn" onClick={() => setVerification(null)}>
          Verify Again
        </button>
      )}
    </div>
  );
}

export default DeploymentVerificationPanel;
