import React from 'react';
import './DashboardFooter.css';

// SVG Assets
import logoWithBackground from '../../assets/logo-with-background.svg';

function DashboardFooter() {
  return (
    <footer className="db-footer">
      <div className="db-footer-container">
        
        {/* Left Column: Branding Description & Socials */}
        <div className="db-footer-brand">
          <img src={logoWithBackground} alt="CloudPilot Logo" className="db-footer-logo-img" />
          <p className="db-footer-desc">
            The world's first autonomous engineering engine for the modern cloud stack.
          </p>
          <div className="db-footer-socials">
            {/* Globe icon */}
            <a href="#globe" className="social-icon-link" aria-label="Website">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </a>
            {/* Connection nodes / control-plane icon */}
            <a href="#control-plane" className="social-icon-link" aria-label="Control Plane">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="3"></circle>
                <circle cx="12" cy="19" r="3"></circle>
                <circle cx="5" cy="12" r="3"></circle>
                <circle cx="19" cy="12" r="3"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </a>
            {/* Terminal console prompt icon */}
            <a href="#terminal" className="social-icon-link" aria-label="Terminal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 17 10 11 4 5"></polyline>
                <line x1="12" y1="19" x2="20" y2="19"></line>
              </svg>
            </a>
          </div>
        </div>

        {/* Right Columns: Platform, Resources, Company Links */}
        <div className="db-footer-links-grid">
          <div className="footer-links-col">
            <h4 className="footer-col-title">PLATFORM</h4>
            <a href="#dashboard" className="footer-link">Dashboard</a>
            <a href="#ai-engine" className="footer-link">AI Engine</a>
            <a href="#integrations" className="footer-link">Integrations</a>
            <a href="#security" className="footer-link">Security</a>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-title">RESOURCES</h4>
            <a href="#docs" className="footer-link">Documentation</a>
            <a href="#api" className="footer-link">API Reference</a>
            <a href="#status" className="footer-link">Status</a>
            <a href="#blog" className="footer-link">Blog</a>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-title">COMPANY</h4>
            <a href="#about" className="footer-link">About Us</a>
            <a href="#careers" className="footer-link">Careers</a>
            <a href="#privacy" className="footer-link">Privacy</a>
            <a href="#contact" className="footer-link">Contact</a>
          </div>
        </div>

      </div>

      <div className="db-footer-bottom">
        <p className="footer-bottom-text">© 2024 CloudPilot AI. All systems operational.</p>
      </div>
    </footer>
  );
}

export default DashboardFooter;
