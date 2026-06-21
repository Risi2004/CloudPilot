import React from 'react';
import operatorIcon from '../../assets/Operator.svg';
import './ProfileCard.css';
import './OperatorDetails.css';

const DESIGNATIONS = [
  'Principal Architect',
  'Cloud Engineer',
  'DevOps Lead',
  'Full Stack Developer',
  'Platform Engineer',
];

function OperatorDetails({
  fullName,
  userEmail,
  designation,
  onFullNameChange,
  onDesignationChange,
  onSubmit,
  isLoading,
  errorMsg,
  successMsg,
}) {
  return (
    <section className="vp-card operator-details-card">
      <div className="vp-card-header">
        <h3 className="vp-card-title">
          <img src={operatorIcon} alt="" className="vp-card-title-icon" width="16" height="16" />
          Operator Details
        </h3>
      </div>

      {errorMsg && <div className="vp-alert error">{errorMsg}</div>}
      {successMsg && <div className="vp-alert success">{successMsg}</div>}

      <form onSubmit={onSubmit} className="operator-form">
        <div className="operator-form-row">
          <div className="operator-field">
            <label className="operator-label" htmlFor="operator-name">NAME</label>
            <input
              id="operator-name"
              type="text"
              className="operator-input"
              value={fullName}
              onChange={(e) => onFullNameChange(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>
          <div className="operator-field">
            <label className="operator-label" htmlFor="operator-email">EMAIL</label>
            <input
              id="operator-email"
              type="email"
              className="operator-input readonly"
              value={userEmail}
              readOnly
            />
          </div>
          <div className="operator-field">
            <label className="operator-label" htmlFor="operator-designation">DESIGNATION</label>
            <select
              id="operator-designation"
              className="operator-input operator-select"
              value={designation}
              onChange={(e) => onDesignationChange(e.target.value)}
            >
              {DESIGNATIONS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" className="operator-save-btn" disabled={isLoading}>
          {isLoading ? 'SAVING...' : 'SAVE CONFIGURATION'}
        </button>
      </form>
    </section>
  );
}

export default OperatorDetails;
