import React from 'react';
import './InterviewChat.css';

function InterviewChat({
  messages,
  currentQuestion,
  answerInput,
  onAnswerChange,
  onSubmit,
  isSubmitting,
  confidence,
  knownFromAnalysis,
}) {
  const isChoice = currentQuestion?.answer_type === 'choice' || currentQuestion?.answer_type === 'boolean';
  const choices = currentQuestion?.choices?.length
    ? currentQuestion.choices
    : currentQuestion?.answer_type === 'boolean'
      ? ['Yes', 'No']
      : [];

  return (
    <div className="ps-interview-panel">
      <div className="ps-interview-header">
        <div>
          <span className="ps-agent-badge font-mono">PLATFORM SELECTION AGENT</span>
          <h2 className="ps-interview-title">Deployment Requirements Interview</h2>
          <p className="ps-interview-subtitle">
            I&apos;ll ask a few targeted questions based on your repository analysis before recommending a platform.
          </p>
        </div>
        <div className="ps-confidence-badge">
          <span className="ps-confidence-value">{Math.round((confidence || 0) * 100)}%</span>
          <span className="ps-confidence-label">CONFIDENCE</span>
        </div>
      </div>

      {knownFromAnalysis?.length > 0 && (
        <div className="ps-known-facts">
          <span className="ps-known-label">Already known from analysis:</span>
          <div className="ps-known-tags">
            {knownFromAnalysis.slice(0, 6).map((fact) => (
              <span key={fact} className="ps-known-tag">{fact}</span>
            ))}
          </div>
        </div>
      )}

      <div className="ps-chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`ps-chat-bubble ps-chat-${msg.role}`}>
            {msg.role === 'agent' && <span className="ps-chat-role">CloudPilot</span>}
            <p>{msg.text}</p>
          </div>
        ))}
        {isSubmitting && (
          <div className="ps-chat-bubble ps-chat-agent ps-chat-loading">
            <span className="ps-chat-role">CloudPilot</span>
            <p>Thinking…</p>
          </div>
        )}
      </div>

      {currentQuestion && !isSubmitting && (
        <form className="ps-answer-form" onSubmit={onSubmit}>
          {currentQuestion.context && (
            <p className="ps-question-context">{currentQuestion.context}</p>
          )}
          <p className="ps-current-question">{currentQuestion.text}</p>

          {isChoice ? (
            <div className="ps-choice-grid">
              {choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className={`ps-choice-btn ${answerInput === choice ? 'selected' : ''}`}
                  onClick={() => onAnswerChange(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              className="ps-answer-input"
              value={answerInput}
              onChange={(e) => onAnswerChange(e.target.value)}
              placeholder="Type your answer…"
              rows={3}
              required
            />
          )}

          <button
            type="submit"
            className="ps-submit-btn"
            disabled={!answerInput?.trim()}
          >
            Continue →
          </button>
        </form>
      )}
    </div>
  );
}

export default InterviewChat;
