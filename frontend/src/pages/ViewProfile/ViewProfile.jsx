import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/Dashboard/DashboardLayout';
import ProfileStatsRow from '../../components/ViewProfile/ProfileStatsRow';
import ActiveIntegrations from '../../components/ViewProfile/ActiveIntegrations';
import ProfileSummaryCard from '../../components/ViewProfile/ProfileSummaryCard';
import TeamManagement from '../../components/ViewProfile/TeamManagement';
import AccessTokens from '../../components/ViewProfile/AccessTokens';
import OperatorDetails from '../../components/ViewProfile/OperatorDetails';
import SecurityCard from '../../components/ViewProfile/SecurityCard';
import AlertsPreferences from '../../components/ViewProfile/AlertsPreferences';
import BillingHistory from '../../components/ViewProfile/BillingHistory';
import TerminalOperations from '../../components/ViewProfile/TerminalOperations';
import profileIcon from '../../assets/profile.svg';
import './ViewProfile.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function ViewProfile() {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [avatar, setAvatar] = useState(profileIcon);
  const [designation, setDesignation] = useState('Principal Architect');

  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [passErrorMsg, setPassErrorMsg] = useState('');
  const [passSuccessMsg, setPassSuccessMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`${API_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Session verification failed.');
        return res.json();
      })
      .then((data) => {
        applyUserData(data.user);
      })
      .catch(() => {
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
  }, []);

  const applyUserData = (user) => {
    setUserName(user.fullName || 'Commander');
    setUserEmail(user.email || '');
    setFullName(user.fullName || '');

    if (user.profileImageKey) {
      const filename = user.profileImageKey.split('/').pop();
      setAvatar(`${API_URL}/api/auth/profile-image/${filename}`);
    } else {
      setAvatar(profileIcon);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Avatar image size exceeds the 5MB limit.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      setErrorMsg('Invalid file format. Only JPG, JPEG, and PNG are accepted.');
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      setUploadLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/api/auth/update-profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ profileImage: reader.result }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || 'Failed to upload avatar.');

        const newKey = data.user.profileImageKey;
        localStorage.setItem('profileImageKey', newKey);
        window.dispatchEvent(new Event('profileUpdate'));

        const filename = newKey.split('/').pop();
        setAvatar(`${API_URL}/api/auth/profile-image/${filename}`);
        setSuccessMsg('Profile avatar updated successfully.');
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName: fullName.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Profile name update failed.');

      localStorage.setItem('fullName', data.user.fullName);
      setUserName(data.user.fullName);
      window.dispatchEvent(new Event('profileUpdate'));

      setSuccessMsg('Configuration saved successfully.');
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
      setPassErrorMsg('All password fields are required.');
      setTimeout(() => setPassErrorMsg(''), 4000);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassErrorMsg('New password confirmation does not match.');
      setTimeout(() => setPassErrorMsg(''), 4000);
      return;
    }

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setPassErrorMsg('Password must be at least 8 characters and contain both letters and numbers.');
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Password update failed.');

      setPassSuccessMsg('Password updated successfully.');
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
        <ProfileStatsRow />

        <div className="profile-main-grid">
          <div className="profile-left-col">
            <ActiveIntegrations />
            <TeamManagement />
            <OperatorDetails
              fullName={fullName}
              userEmail={userEmail}
              designation={designation}
              onFullNameChange={setFullName}
              onDesignationChange={setDesignation}
              onSubmit={handleNameUpdate}
              isLoading={isLoading}
              errorMsg={errorMsg}
              successMsg={successMsg}
            />
          </div>

          <div className="profile-right-col">
            <ProfileSummaryCard
              userName={userName}
              designation={designation}
              avatar={avatar}
              uploadLoading={uploadLoading}
              onAvatarChange={handleImageChange}
            />
            <AccessTokens />
            <SecurityCard
              currentPassword={currentPassword}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              onCurrentPasswordChange={setCurrentPassword}
              onNewPasswordChange={setNewPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onPasswordSubmit={handlePasswordUpdate}
              isLoading={isLoading}
              passErrorMsg={passErrorMsg}
              passSuccessMsg={passSuccessMsg}
            />
            <AlertsPreferences />
          </div>
        </div>

        <div className="profile-bottom-section">
          <BillingHistory />
          <TerminalOperations />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ViewProfile;
