import React from 'react';
import './Footer.css';
import logo from '../../../assets/logo-without-background.svg';

function Footer() {
  const currentYear = new Date().getFullYear();

  const globeIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="2" y1="12" x2="22" y2="12"></line>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
  );

  const twitterIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
    </svg>
  );

  const linkedinIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
      <rect x="2" y="9" width="4" height="12"></rect>
      <circle cx="4" cy="4" r="2"></circle>
    </svg>
  );

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-main">
          {/* Logo & Intro Column */}
          <div className="footer-brand-col">
            <div className="footer-logo">
              <img src={logo} alt="CloudPilot Logo" className="footer-logo-img" />
            </div>
            <p className="footer-tagline">
              The world's first autonomous engineering engine for the modern cloud stack.
            </p>
            <div className="footer-socials">
              <a href="#web" className="social-link">{globeIcon}</a>
              <a href="#twitter" className="social-link">{twitterIcon}</a>
              <a href="#linkedin" className="social-link">{linkedinIcon}</a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Platform</h4>
            <ul className="footer-links-list">
              <li><a href="#dashboard" className="footer-link">Dashboard</a></li>
              <li><a href="#ai-engine" className="footer-link">AI Engine</a></li>
              <li><a href="#integrations" className="footer-link">Integrations</a></li>
              <li><a href="#security" className="footer-link">Security</a></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-title">Resources</h4>
            <ul className="footer-links-list">
              <li><a href="#docs" className="footer-link">Documentation</a></li>
              <li><a href="#api" className="footer-link">API Reference</a></li>
              <li><a href="#status" className="footer-link">Status</a></li>
              <li><a href="#blog" className="footer-link">Blog</a></li>
            </ul>
          </div>

          <div className="footer-links-col">
            <h4 className="footer-col-title">Company</h4>
            <ul className="footer-links-list">
              <li><a href="#about" className="footer-link">About Us</a></li>
              <li><a href="#careers" className="footer-link">Careers</a></li>
              <li><a href="#privacy" className="footer-link">Privacy</a></li>
              <li><a href="#contact" className="footer-link">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="copyright">
            © {currentYear} CloudPilot AI. All rights reserved.
          </p>
          <div className="system-status">
            <span className="status-dot"></span>
            <span className="status-text">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
