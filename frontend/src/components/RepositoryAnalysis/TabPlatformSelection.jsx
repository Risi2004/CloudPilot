import React, { useState, useEffect, useRef } from 'react';
import './TabPlatformSelection.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function RecommendationCard({ recommendation, onRestart }) {
  if (!recommendation) return null;
  const config = recommendation.serviceConfig || {};
  const reasoning = Array.isArray(recommendation.reasoning) ? recommendation.reasoning : [];
  const citations = Array.isArray(recommendation.citations) ? recommendation.citations : [];

  const configRows = [
    ['Service Type', config.serviceType],
    ['Plan', config.plan],
    ['Region', config.region],
    ['Build Command', config.buildCommand],
    ['Start Command', config.startCommand],
    ['Database', config.database],
    ['Scaling', config.scaling],
    ['Env Handling', config.envHandling],
  ].filter(([, value]) => value);

  return (
    <div className="ps-recommendation-card">
      <div className="ps-recommendation-header">
        <div className="ps-platform-badge">{recommendation.platform}</div>
        {recommendation.confidence && (
          <div className={`ps-confidence-pill ps-confidence-${String(recommendation.confidence).toLowerCase()}`}>
            {recommendation.confidence} confidence
          </div>
        )}
      </div>

      {configRows.length > 0 && (
        <div className="ps-config-grid">
          {configRows.map(([label, value]) => (
            <div key={label} className="ps-config-row">
              <span className="ps-config-label">{label}</span>
              <span className="ps-config-value">{value}</span>
            </div>
          ))}
        </div>
      )}

      {reasoning.length > 0 && (
        <div className="ps-reasoning-box">
          <div className="ps-reasoning-title">Why this recommendation</div>
          <ul className="ps-reasoning-list">
            {reasoning.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {citations.length > 0 && (
        <div className="ps-citations-row">
          {citations.map((c, idx) => (
            <span key={idx} className="ps-citation-tag">{c}</span>
          ))}
        </div>
      )}

      <button type="button" className="ps-restart-btn" onClick={onRestart}>
        Restart Interview
      </button>
    </div>
  );
}

function TabPlatformSelection({ repoUrl }) {
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const loadOrStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const getRes = await fetch(`${API_URL}/api/platform-selection?repoUrl=${encodeURIComponent(repoUrl)}`, {
        headers: authHeaders(),
      });
      const getPayload = await getRes.json();
      if (!getRes.ok) throw new Error(getPayload.message || 'Failed to load the interview.');

      if (getPayload.interview) {
        setInterview(getPayload.interview);
        return;
      }

      const startRes = await fetch(`${API_URL}/api/platform-selection/start`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ repoUrl }),
      });
      const startPayload = await startRes.json();
      if (!startRes.ok) throw new Error(startPayload.message || 'Failed to start the interview.');
      setInterview(startPayload.interview);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repoUrl) loadOrStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoUrl]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [interview]);

  const handleSend = async (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);
    setInputValue('');

    try {
      const res = await fetch(`${API_URL}/api/platform-selection/message`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ repoUrl, message: trimmed }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to send your answer.');
      setInterview(payload.interview);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleRestart = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/platform-selection/start`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ repoUrl, restart: true }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to restart the interview.');
      setInterview(payload.interview);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const messages = (interview && interview.messages) || [];
  const lastMessage = messages[messages.length - 1];
  const isInProgress = interview && interview.status === 'in_progress';
  const quickReplies = isInProgress && lastMessage && lastMessage.role === 'agent' ? lastMessage.quickReplies || [] : [];

  return (
    <div className="tab-pane-content">
      <div className="tab-pane-header">
        <h3 className="tab-pane-title">Platform Selection</h3>
        <p className="tab-pane-subtitle">
          The Platform Selection Agent interviews you about how you want to deploy this repository, then recommends Render or Vercel.
        </p>
      </div>

      <div className="ps-chat-container">
        {loading ? (
          <div className="ps-loading-state">Starting the interview...</div>
        ) : (
          <>
            <div className="ps-chat-messages" ref={scrollRef}>
              {messages.map((m, idx) => (
                <div key={idx} className={`ps-chat-row ps-chat-row-${m.role}`}>
                  <div className={`ps-chat-bubble ps-chat-bubble-${m.role}`}>{m.content}</div>
                </div>
              ))}
              {sending && (
                <div className="ps-chat-row ps-chat-row-agent">
                  <div className="ps-chat-bubble ps-chat-bubble-agent ps-typing">Thinking...</div>
                </div>
              )}
            </div>

            {interview && interview.status === 'completed' && (
              <RecommendationCard recommendation={interview.recommendation} onRestart={handleRestart} />
            )}

            {isInProgress && (
              <div className="ps-composer">
                {quickReplies.length > 0 && (
                  <div className="ps-quick-replies">
                    {quickReplies.map((qr, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="ps-quick-reply-chip"
                        disabled={sending}
                        onClick={() => handleSend(qr)}
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
                <form
                  className="ps-input-row"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend(inputValue);
                  }}
                >
                  <input
                    type="text"
                    className="ps-text-input"
                    placeholder="Type your answer..."
                    value={inputValue}
                    disabled={sending}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  <button type="submit" className="ps-send-btn" disabled={sending || !inputValue.trim()}>
                    Send
                  </button>
                </form>
              </div>
            )}

            {error && <div className="ps-error-banner">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}

export default TabPlatformSelection;
