import React, { useState, useEffect, useCallback, useRef } from 'react';
import TroubleshootingDiagnosisView from './TroubleshootingDiagnosisView';
import TroubleshootingFixDiffView from './TroubleshootingFixDiffView';
import TroubleshootingAttemptHistory from './TroubleshootingAttemptHistory';
import './DeploymentTroubleshootingPanel.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const ACTIVE_STATUSES = new Set(['diagnosing', 'applying_fix', 'redeploying', 'stopping']);
const TERMINAL_BOX = {
  succeeded: { className: 'dtp-success-box', text: 'The deployment is fixed and live again.' },
  manual: { className: 'dtp-manual-box', text: 'Diagnosis shown above for you to resolve manually.' },
  stopped: { className: 'dtp-stopped-box', text: 'Troubleshooting was stopped.' },
};

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

function DeploymentTroubleshootingPanel({ deploymentId }) {
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [troubleshooting, setTroubleshooting] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [error, setError] = useState(null);
  const [reviewingFix, setReviewingFix] = useState(false);
  const [generatingFix, setGeneratingFix] = useState(false);
  const [approving, setApproving] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [resolvingManual, setResolvingManual] = useState(false);
  const pollRef = useRef(null);

  const fetchTroubleshooting = useCallback(async (id) => {
    const res = await fetch(`${API_URL}/api/troubleshooting/${id}`, { headers: authHeaders() });
    const payload = await parseOrThrow(res);
    setTroubleshooting(payload.troubleshooting);
    return payload.troubleshooting;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTroubleshooting(null);
    setError(null);
    setReviewingFix(false);

    (async () => {
      setLoadingHistory(true);
      try {
        const res = await fetch(`${API_URL}/api/troubleshooting?deploymentId=${deploymentId}`, { headers: authHeaders() });
        const payload = await parseOrThrow(res);
        const latest = (payload.troubleshooting || [])[0];
        if (latest && !cancelled) setTroubleshooting(latest);
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

  const troubleshootingId = troubleshooting ? troubleshooting.id : null;
  const status = troubleshooting ? troubleshooting.status : null;

  useEffect(() => {
    if (troubleshootingId && ACTIVE_STATUSES.has(status)) {
      pollRef.current = setInterval(() => {
        fetchTroubleshooting(troubleshootingId).catch((err) => console.error(err));
      }, 3000);
      return () => clearInterval(pollRef.current);
    }
    return undefined;
  }, [troubleshootingId, status, fetchTroubleshooting]);

  const handleDiagnose = async () => {
    setDiagnosing(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/troubleshooting/diagnose`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ deploymentId }),
      });
      const payload = await parseOrThrow(res);
      setTroubleshooting(payload.troubleshooting);
    } catch (err) {
      setError(err.message);
    } finally {
      setDiagnosing(false);
    }
  };

  const handleManual = async () => {
    setResolvingManual(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/troubleshooting/${troubleshootingId}/manual`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const payload = await parseOrThrow(res);
      setTroubleshooting(payload.troubleshooting);
    } catch (err) {
      setError(err.message);
    } finally {
      setResolvingManual(false);
    }
  };

  const handleAutoFix = async () => {
    setError(null);
    const githubToken = localStorage.getItem('github_token');

    if (troubleshooting.diagnosis.category === 'code') {
      setGeneratingFix(true);
      try {
        const res = await fetch(`${API_URL}/api/troubleshooting/${troubleshootingId}/generate-fix`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ githubToken }),
        });
        const payload = await parseOrThrow(res);
        setTroubleshooting(payload.troubleshooting);
        setReviewingFix(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setGeneratingFix(false);
      }
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/troubleshooting/${troubleshootingId}/auto-fix`, {
        method: 'POST',
        headers: authHeaders(),
      });
      await parseOrThrow(res);
      await fetchTroubleshooting(troubleshootingId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApproveFix = async () => {
    setApproving(true);
    setError(null);
    try {
      const githubToken = localStorage.getItem('github_token');
      const res = await fetch(`${API_URL}/api/troubleshooting/${troubleshootingId}/approve-fix`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ githubToken }),
      });
      await parseOrThrow(res);
      setReviewingFix(false);
      await fetchTroubleshooting(troubleshootingId);
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await fetch(`${API_URL}/api/troubleshooting/${troubleshootingId}/stop`, { method: 'POST', headers: authHeaders() });
      await fetchTroubleshooting(troubleshootingId);
    } catch (err) {
      console.error(err);
    } finally {
      setStopping(false);
    }
  };

  if (loadingHistory) return null;

  const canRetry = troubleshooting && !ACTIVE_STATUSES.has(troubleshooting.status) && troubleshooting.status !== 'awaiting_user_choice';
  const terminalBox = troubleshooting && TERMINAL_BOX[troubleshooting.status];
  const showChoiceButtons =
    troubleshooting && troubleshooting.status === 'awaiting_user_choice' && !reviewingFix;

  return (
    <div className="dtp-wrapper">
      {!troubleshooting && (
        <button type="button" className="dtp-diagnose-btn" disabled={diagnosing} onClick={handleDiagnose}>
          {diagnosing ? 'Analyzing failure logs...' : 'Diagnose This Failure'}
        </button>
      )}

      {error && <div className="dtp-error-banner">{error}</div>}

      {troubleshooting && (
        <TroubleshootingDiagnosisView
          troubleshooting={troubleshooting}
          showChoiceButtons={showChoiceButtons}
          onAutoFix={handleAutoFix}
          onManual={handleManual}
          generatingFix={generatingFix}
          resolvingManual={resolvingManual}
        />
      )}

      {troubleshooting && reviewingFix && troubleshooting.proposedFix && troubleshooting.proposedFix.files.length > 0 && (
        <TroubleshootingFixDiffView
          proposedFix={troubleshooting.proposedFix}
          onApprove={handleApproveFix}
          onCancel={() => setReviewingFix(false)}
          approving={approving}
        />
      )}

      {troubleshooting && ['applying_fix', 'redeploying'].includes(troubleshooting.status) && (
        <div className="dtp-progress-row">
          <span className="dtp-progress-text">
            Applying fix and redeploying... (attempt {troubleshooting.attempt} / {troubleshooting.maxAttempts})
          </span>
          <button type="button" className="dtp-stop-btn" disabled={stopping} onClick={handleStop}>
            {stopping ? 'Stopping...' : 'Stop'}
          </button>
        </div>
      )}

      {troubleshooting && (troubleshooting.attemptHistory || []).length > 0 && (
        <TroubleshootingAttemptHistory attemptHistory={troubleshooting.attemptHistory} />
      )}

      {troubleshooting && troubleshooting.status === 'failed' && troubleshooting.resolution && (
        <div className="dtp-failed-box">
          <p className="dtp-failed-summary">{troubleshooting.resolution.summary}</p>
          {troubleshooting.resolution.unresolvedReason && (
            <p className="dtp-failed-reason">{troubleshooting.resolution.unresolvedReason}</p>
          )}
        </div>
      )}

      {terminalBox && troubleshooting.status !== 'failed' && (
        <div className={terminalBox.className}>{terminalBox.text}</div>
      )}

      {canRetry && (
        <button type="button" className="dtp-retry-btn" onClick={() => setTroubleshooting(null)}>
          Diagnose Again
        </button>
      )}
    </div>
  );
}

export default DeploymentTroubleshootingPanel;
