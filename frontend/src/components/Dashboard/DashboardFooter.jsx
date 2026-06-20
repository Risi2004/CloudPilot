import React from 'react';
import './DashboardFooter.css';

// SVG Assets
import logoWithBackground from '../../assets/logo-with-background.svg';

function DashboardFooter() {
  const currentYear = new Date().getFullYear();
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
            {/* Twitter icon */}
            <a href="#twitter" className="social-icon-link" aria-label="Twitter">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
              </svg>
            </a>
            {/* LinkedIn icon */}
            <a href="#linkedin" className="social-icon-link" aria-label="LinkedIn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                <rect x="2" y="9" width="4" height="12"></rect>
                <circle cx="4" cy="4" r="2"></circle>
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
        <p className="footer-bottom-text">© {currentYear} CloudPilot AI. All systems operational.</p>
      </div>
    </footer>
  );
}

export default DashboardFooter;
