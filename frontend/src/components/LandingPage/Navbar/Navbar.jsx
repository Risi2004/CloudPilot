import React from 'react';
import './Navbar.css';
import logo from '../../../assets/logo-without-background.svg';

function Navbar() {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <img src={logo} alt="CloudPilot Logo" className="logo-img" />
        </div>
        
        <div className="navbar-links">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="nav-link">Home</button>
          <button onClick={() => scrollToSection('core-intelligence')} className="nav-link">CoreIntelligence</button>
          <button onClick={() => scrollToSection('how-it-works')} className="nav-link">HowItWorks</button>
        </div>
        
        <div className="navbar-actions">
          <button className="signin-btn">Sign In</button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
