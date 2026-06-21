import React, { useState } from 'react';
import alertsIcon from '../../assets/Alerts.svg';
import './ProfileCard.css';
import './AlertsPreferences.css';

const ALERT_OPTIONS = [
  { id: 'deployments', label: 'DEPLOYMENTS', defaultChecked: true },
  { id: 'security', label: 'SECURITY', defaultChecked: true },
  { id: 'costing', label: 'COSTING', defaultChecked: false },
];

function AlertsPreferences() {
  const [preferences, setPreferences] = useState(
    Object.fromEntries(ALERT_OPTIONS.map((o) => [o.id, o.defaultChecked]))
  );

  const toggle = (id) => {
    setPreferences((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="vp-card alerts-preferences-card">
      <div className="vp-card-header">
        <h3 className="vp-card-title">
          <img src={alertsIcon} alt="" className="vp-card-title-icon" width="16" height="16" />
          Alerts
        </h3>
      </div>

      <div className="alerts-list">
        {ALERT_OPTIONS.map((option) => (
          <label key={option.id} className="alert-option">
            <input
              type="checkbox"
              className="alert-checkbox"
              checked={preferences[option.id]}
              onChange={() => toggle(option.id)}
            />
            <span className="alert-checkmark" />
            <span className="alert-label">{option.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

export default AlertsPreferences;
