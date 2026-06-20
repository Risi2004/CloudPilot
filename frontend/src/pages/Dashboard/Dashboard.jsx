import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Welcome to the CloudPilot Mission Control.</p>
        <button className="dashboard-home-btn" onClick={() => navigate('/')}>
          Return to Home
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
