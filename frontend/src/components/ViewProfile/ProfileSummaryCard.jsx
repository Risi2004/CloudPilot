import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import editIcon from '../../assets/edit.svg';
import './ProfileCard.css';
import './ProfileSummaryCard.css';

function ProfileSummaryCard({
  userName,
  designation,
  avatar,
  uploadLoading,
  onAvatarChange,
}) {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const projectsUsed = 2;
  const projectsMax = 3;
  const deploymentsUsed = 5;
  const deploymentsMax = 10;

  return (
    <section className="vp-card profile-summary-card">
      <div className="profile-summary-avatar-wrap">
        <img
          src={avatar}
          alt={userName}
          className={`profile-summary-avatar ${uploadLoading ? 'loading' : ''}`}
        />
        <button
          type="button"
          className="profile-summary-edit-btn"
          onClick={triggerUpload}
          disabled={uploadLoading}
          aria-label="Upload profile photo"
        >
          {uploadLoading ? (
            <span className="profile-spinner" />
          ) : (
            <img src={editIcon} alt="" className="profile-edit-icon" />
          )}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={onAvatarChange}
          style={{ display: 'none' }}
          accept="image/png, image/jpeg, image/jpg"
        />
      </div>

      <h2 className="profile-summary-name">{userName || 'Operator'}</h2>
      <p className="profile-summary-title">{designation}</p>

      <div className="profile-plan-section">
        <div className="profile-plan-header">
          <span className="profile-plan-label">CURRENT PLAN</span>
          <span className="profile-plan-badge">FREE</span>
        </div>

        <div className="profile-usage-item">
          <div className="profile-usage-top">
            <span className="profile-usage-label">Projects</span>
            <span className="profile-usage-count">{projectsUsed}/{projectsMax}</span>
          </div>
          <div className="profile-usage-bar">
            <div
              className="profile-usage-fill"
              style={{ width: `${(projectsUsed / projectsMax) * 100}%` }}
            />
          </div>
        </div>

        <div className="profile-usage-item">
          <div className="profile-usage-top">
            <span className="profile-usage-label">Deployments</span>
            <span className="profile-usage-count">{deploymentsUsed}/{deploymentsMax}</span>
          </div>
          <div className="profile-usage-bar">
            <div
              className="profile-usage-fill deployments"
              style={{ width: `${(deploymentsUsed / deploymentsMax) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <button type="button" className="profile-upgrade-btn" onClick={() => navigate('/upgrade')}>
        Upgrade Plan
      </button>
    </section>
  );
}

export default ProfileSummaryCard;
