import React from 'react';
import './ProfileCard.css';
import './TeamManagement.css';

const TEAM_MEMBERS = [
  {
    id: 1,
    name: 'Risikesan',
    email: 'risi@cloudpilot.io',
    role: 'OWNER',
    status: 'ONLINE',
    initials: 'R',
    avatarColor: '#6366f1',
  },
  {
    id: 2,
    name: 'Alex Chen',
    email: 'alex@cloudpilot.io',
    role: 'DEVELOPER',
    status: 'ONLINE',
    initials: 'AC',
    avatarColor: '#0ea5e9',
  },
  {
    id: 3,
    name: 'Sarah Miller',
    email: 'sarah@cloudpilot.io',
    role: 'DEVELOPER',
    status: 'IDLE',
    initials: 'SM',
    avatarColor: '#8b5cf6',
  },
];

function TeamManagement() {
  return (
    <section className="vp-card team-management-card">
      <div className="vp-card-header">
        <h3 className="vp-card-title">
          <svg className="vp-card-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Team Management
        </h3>
        <button type="button" className="vp-card-action-btn">INVITE</button>
      </div>

      <div className="team-table">
        <div className="team-table-head">
          <span className="team-col operator-col">OPERATOR</span>
          <span className="team-col role-col">ROLE</span>
          <span className="team-col status-col">STATUS</span>
        </div>

        {TEAM_MEMBERS.map((member) => (
          <div key={member.id} className="team-table-row">
            <div className="team-col operator-col">
              <div
                className="team-avatar"
                style={{ background: member.avatarColor }}
              >
                {member.initials}
              </div>
              <div className="team-operator-info">
                <span className="team-operator-name">{member.name}</span>
                <span className="team-operator-email">{member.email}</span>
              </div>
            </div>
            <div className="team-col role-col">
              <span className={`team-role-badge role-${member.role.toLowerCase()}`}>
                {member.role}
              </span>
            </div>
            <div className="team-col status-col">
              <span className={`team-status ${member.status.toLowerCase()}`}>
                <span className={`vp-status-dot ${member.status.toLowerCase()}`} />
                {member.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default TeamManagement;
