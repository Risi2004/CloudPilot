import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';
import logo from '../../../assets/logo-without-background.svg';
import menuIcon from '../../../assets/menu.svg';

function Navbar() {
  const navigate = useNavigate();
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    const sections = ['core-intelligence', 'how-it-works', 'pricing', 'faq', 'contact'];
    
    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -60% 0px',
      threshold: 0
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    const handleScroll = () => {
      if (window.scrollY < 120) {
        setActiveSection('home');
      }
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (isOverlayOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOverlayOpen]);

  const handleLinkClick = (id) => {
    setIsOverlayOpen(false);
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-logo" onClick={() => handleLinkClick('home')}>
            <img src={logo} alt="CloudPilot Logo" className="logo-img" />
          </div>
          
          <div className="navbar-links">
            <button onClick={() => handleLinkClick('home')} className={`nav-link ${activeSection === 'home' ? 'active' : ''}`}>Home</button>
            <button onClick={() => handleLinkClick('core-intelligence')} className={`nav-link ${activeSection === 'core-intelligence' ? 'active' : ''}`}>CoreIntelligence</button>
            <button onClick={() => handleLinkClick('how-it-works')} className={`nav-link ${activeSection === 'how-it-works' ? 'active' : ''}`}>HowItWorks</button>
            <button onClick={() => handleLinkClick('pricing')} className={`nav-link ${activeSection === 'pricing' ? 'active' : ''}`}>Pricings</button>
            <button onClick={() => handleLinkClick('faq')} className={`nav-link ${activeSection === 'faq' ? 'active' : ''}`}>FAQ</button>
            <button onClick={() => handleLinkClick('contact')} className={`nav-link ${activeSection === 'contact' ? 'active' : ''}`}>Contact</button>
          </div>
          
          <div className="navbar-actions">
            <button className="signin-btn" onClick={() => navigate('/login')}>Sign In</button>
            <button className="menu-btn" onClick={() => setIsOverlayOpen(true)}>
              <img src={menuIcon} alt="Menu" className="menu-icon-img" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay Menu */}
      <div className={`navbar-mobile-overlay ${isOverlayOpen ? 'active' : ''}`}>
        <div className="overlay-header">
          <img src={logo} alt="CloudPilot Logo" className="logo-img" />
          <button className="close-btn" onClick={() => setIsOverlayOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="overlay-links">
          <button onClick={() => handleLinkClick('home')} className={`overlay-link ${activeSection === 'home' ? 'active' : ''}`}>Home</button>
          <button onClick={() => handleLinkClick('core-intelligence')} className={`overlay-link ${activeSection === 'core-intelligence' ? 'active' : ''}`}>CoreIntelligence</button>
          <button onClick={() => handleLinkClick('how-it-works')} className={`overlay-link ${activeSection === 'how-it-works' ? 'active' : ''}`}>HowItWorks</button>
          <button onClick={() => handleLinkClick('pricing')} className={`overlay-link ${activeSection === 'pricing' ? 'active' : ''}`}>Pricings</button>
          <button onClick={() => handleLinkClick('faq')} className={`overlay-link ${activeSection === 'faq' ? 'active' : ''}`}>FAQ</button>
          <button onClick={() => handleLinkClick('contact')} className={`overlay-link ${activeSection === 'contact' ? 'active' : ''}`}>Contact</button>
          <button onClick={() => { setIsOverlayOpen(false); navigate('/login'); }} className="overlay-signin-btn">Sign In</button>
        </div>
      </div>
    </>
  );
}

export default Navbar;
