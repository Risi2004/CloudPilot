import React from 'react';

// SVG Assets
import googleIcon from '../../assets/google.svg';
import githubIcon from '../../assets/github.svg';

function OAuthSection() {
  return (
    <>
      {/* Social Oauth Buttons */}
      <div className="oauth-buttons-row">
        <button className="oauth-btn" type="button" onClick={() => console.log('Oauth Google')}>
          <img src={googleIcon} alt="Google" className="oauth-icon" />
          Google
        </button>
        <button className="oauth-btn" type="button" onClick={() => console.log('Oauth GitHub')}>
          <img src={githubIcon} alt="GitHub" className="oauth-icon" />
          GitHub
        </button>
      </div>

      {/* Secure Protocol Divider */}
      <div className="protocol-divider">
        <div className="divider-line"></div>
        <span className="divider-text">SECURE PROTOCOL</span>
        <div className="divider-line"></div>
      </div>
    </>
  );
}

export default OAuthSection;
