import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import profileIcon from '../../assets/profile.svg';
import editIcon from '../../assets/edit.svg';
import './ViewProfile.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function ViewProfile() {
  const fileInputRef = useRef(null);
  
  // User Data State
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [avatar, setAvatar] = useState(profileIcon);
  const [memberSince, setMemberSince] = useState('N/A');

  // Input states for forms
  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [passErrorMsg, setPassErrorMsg] = useState('');
  const [passSuccessMsg, setPassSuccessMsg] = useState('');

  useEffect(() => {
    // Load initial user details
    const token = localStorage.getItem('token');
    if (token) {
      // Fetch fresh details from backend to ensure accuracy
      fetch(`${API_URL}/api/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Session verification failed.');
        return res.json();
      })
      .then(data => {
        const user = data.user;
        setUserName(user.fullName || 'Commander');
        setUserEmail(user.email || 'commander@fleet.io');
        setFullName(user.fullName || '');
        
        // Format creation date if available
        if (user.createdAt) {
          const date = new Date(user.createdAt);
          setMemberSince(date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
        }

        if (user.profileImageKey) {
          const filename = user.profileImageKey.split('/').pop();
          setAvatar(`${API_URL}/api/auth/profile-image/${filename}`);
        } else {
          setAvatar(profileIcon);
        }
      })
      .catch((err) => {
        // Fallback to local storage if API call fails
        const name = localStorage.getItem('fullName') || 'Commander';
        const mail = localStorage.getItem('email') || 'commander@fleet.io';
        const savedKey = localStorage.getItem('profileImageKey');
        const savedImage = localStorage.getItem('profileImage');
        
        setUserName(name);
        setUserEmail(mail);
        setFullName(name);
        
        if (savedKey) {
          const filename = savedKey.split('/').pop();
          setAvatar(`${API_URL}/api/auth/profile-image/${filename}`);
        } else if (savedImage) {
          setAvatar(savedImage);
        }
      });
    }
  }, []);

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Avatar image size exceeds the 5MB limit.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    // Validate mime type
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      setErrorMsg('Invalid file format. Only JPG, JPEG, and PNG are accepted.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setUploadLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/auth/update-profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ profileImage: base64String })
        });
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.message || 'Failed to upload avatar.');
        }

        // Store new key and notify other components
        const newKey = data.user.profileImageKey;
        localStorage.setItem('profileImageKey', newKey);
        window.dispatchEvent(new Event('profileUpdate'));
        
        const filename = newKey.split('/').pop();
        setAvatar(`${API_URL}/api/auth/profile-image/${filename}`);
        setSuccessMsg('Profile security avatar updated successfully.');
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err) {
        setErrorMsg(err.message);
        setTimeout(() => setErrorMsg(''), 4000);
      } finally {
        setUploadLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    if (!fullName || fullName.trim().length < 2) {
      setErrorMsg('Full Name must be at least 2 characters long.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fullName: fullName.trim() })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Profile name update failed.');
      }

      localStorage.setItem('fullName', data.user.fullName);
      setUserName(data.user.fullName);
      window.dispatchEvent(new Event('profileUpdate'));
      
      setSuccessMsg('Operator credentials synchronized successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassErrorMsg('All encryption key fields are required.');
      setTimeout(() => setPassErrorMsg(''), 4000);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassErrorMsg('New credentials confirmation does not match.');
      setTimeout(() => setPassErrorMsg(''), 4000);
      return;
    }

    // Password regex check
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setPassErrorMsg('New Encryption Key must be at least 8 characters long and contain both letters and numbers.');
      setTimeout(() => setPassErrorMsg(''), 4000);
      return;
    }

    setIsLoading(true);
    setPassErrorMsg('');
    setPassSuccessMsg('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Encryption key update failed.');
      }

      setPassSuccessMsg('Security keys successfully rotated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPassSuccessMsg(''), 4000);
    } catch (err) {
      setPassErrorMsg(err.message);
      setTimeout(() => setPassErrorMsg(''), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="profile-page-wrapper">
        
        {/* Top welcome section */}
        <header className="profile-header-section">
          <div className="header-text-container">
            <h1 className="profile-page-title">Profile Command Center</h1>
            <p className="profile-page-subtitle">
              Manage your space-fleet access authorization, encryption keys, and avatar configuration.
            </p>
          </div>
        </header>

        {/* Profile dashboard grid */}
        <div className="profile-grid-container">
          
          {/* Left Column: Profile Card */}
          <div className="profile-card-container">
            <div className="profile-avatar-wrapper">
              <img 
                src={avatar} 
                alt="Operator Avatar" 
                className={`profile-avatar-img ${uploadLoading ? 'blur-loading' : ''}`} 
              />
              <button 
                type="button" 
                className="avatar-edit-overlay-btn" 
                onClick={triggerFileSelect}
                disabled={uploadLoading}
              >
                {uploadLoading ? (
                  <span className="spinner-mini"></span>
                ) : (
                  <>
                    <img src={editIcon} alt="Edit" className="edit-overlay-icon" />
                    <span>Upload Image</span>
                  </>
                )}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                style={{ display: 'none' }} 
                accept="image/png, image/jpeg, image/jpg"
              />
            </div>
            
            <div className="profile-info-block">
              <h2 className="operator-display-name">{userName}</h2>
              <p className="operator-role-badge">Fleet Commander</p>
              
              <div className="divider-glow"></div>
              
              <div className="metadata-row">
                <span className="meta-label">ACCESS STATUS:</span>
                <span className="meta-val active-status">
                  <span className="active-status-dot"></span> AUTHENTICATED
                </span>
              </div>
              <div className="metadata-row">
                <span className="meta-label">ACCESS ID:</span>
                <span className="meta-val">{userEmail}</span>
              </div>
              <div className="metadata-row">
                <span className="meta-label">SECTOR REGISTRY:</span>
                <span className="meta-val">Solar-System IV-A</span>
              </div>
              <div className="metadata-row">
                <span className="meta-label">INITIALIZED:</span>
                <span className="meta-val">{memberSince}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Profile Edits */}
          <div className="profile-settings-container">
            
            {/* Form 1: Profile Details */}
            <div className="settings-section-card">
              <h3 className="section-card-title">Operator Credentials</h3>
              <p className="section-card-subtitle">Update your official identification name mapped within the fleet directory.</p>
              
              {errorMsg && <div className="alert-message error">{errorMsg}</div>}
              {successMsg && <div className="alert-message success">{successMsg}</div>}
              
              <form onSubmit={handleNameUpdate} className="settings-form">
                <div className="input-group-profile">
                  <label className="input-profile-label">OPERATOR IDENTIFIER (READ-ONLY)</label>
                  <input 
                    type="email" 
                    value={userEmail} 
                    disabled 
                    className="input-profile-field disabled" 
                  />
                </div>
                
                <div className="input-group-profile">
                  <label className="input-profile-label">OPERATOR FULL NAME</label>
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    placeholder="E.g., Commander Shepherd" 
                    className="input-profile-field"
                    required 
                  />
                </div>

                <button 
                  type="submit" 
                  className="profile-action-btn"
                  disabled={isLoading}
                >
                  {isLoading ? 'SYNCHRONIZING...' : 'SYNCHRONIZE IDENTIFIER'}
                </button>
              </form>
            </div>

            {/* Form 2: Password Rotation */}
            <div className="settings-section-card">
              <h3 className="section-card-title">Encryption Key Rotation</h3>
              <p className="section-card-subtitle">Rotate your login verification credentials. Rotating keys frequently maintains defense security.</p>
              
              {passErrorMsg && <div className="alert-message error">{passErrorMsg}</div>}
              {passSuccessMsg && <div className="alert-message success">{passSuccessMsg}</div>}

              <form onSubmit={handlePasswordUpdate} className="settings-form">
                <div className="input-group-profile">
                  <label className="input-profile-label">CURRENT ENCRYPTION KEY</label>
                  <input 
                    type="password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                    placeholder="••••••••••••••••" 
                    className="input-profile-field"
                    required
                  />
                </div>
                
                <div className="input-group-profile-split">
                  <div className="input-group-profile">
                    <label className="input-profile-label">NEW ENCRYPTION KEY</label>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      placeholder="••••••••••••••••" 
                      className="input-profile-field"
                      required
                    />
                  </div>
                  <div className="input-group-profile">
                    <label className="input-profile-label">CONFIRM NEW KEY</label>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="••••••••••••••••" 
                      className="input-profile-field"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="profile-action-btn rotate"
                  disabled={isLoading}
                >
                  {isLoading ? 'ROTATING...' : 'ROTATE ENCRYPTION KEYS'}
                </button>
              </form>
            </div>

          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}

export default ViewProfile;
