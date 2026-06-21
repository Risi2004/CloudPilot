import React from 'react';
import './ProfileStatsRow.css';

const STATS = [
  { label: 'REPOS', value: '32', accent: 'cyan' },
  { label: 'DEPLOYMENTS', value: '12', accent: 'blue' },
  { label: 'RESOLVED', value: '05', accent: 'green' },
  { label: 'INFRA', value: '21', accent: 'white' },
];

function ProfileStatsRow() {
  return (
    <div className="vp-stats-row">
      {STATS.map((stat) => (
        <div key={stat.label} className={`vp-stat-card accent-${stat.accent}`}>
          <span className="vp-stat-label">{stat.label}</span>
          <span className="vp-stat-value">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}

export default ProfileStatsRow;
