import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Hero.css';
import HexGridBackground from './HexGridBackground';
import awsLogo from '../../../assets/aws.svg';
import k8sLogo from '../../../assets/kubernetes.svg';
import vercelLogo from '../../../assets/vercel.svg';
import renderLogo from '../../../assets/render.svg';
import railwayLogo from '../../../assets/railway.svg';

function Hero() {
  const navigate = useNavigate();
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(!!localStorage.getItem('token'));
  }, []);

  return (
    <section className="hero">
      <HexGridBackground />

      <div className="hero-container">
        <h1 className="hero-title">
          Your Autonomous <br />
          <span className="hero-title-accent">Cloud Engineer</span>
        </h1>

        <p className="hero-subtitle">
          Deploy. Manage. Heal. Automate. <br />
          CloudPilot monitors your infrastructure 24/7, fixing bottlenecks before they become incidents.
        </p>

        <div className="hero-ctas">
          <button className="cta-primary" onClick={() => navigate(hasToken ? '/dashboard' : '/signup')}>
            {hasToken ? 'Go to Dashboard' : 'Initialize Engine'}
          </button>
          <button className="cta-secondary">Read Documentation</button>
        </div>

        <div className="hero-badges">
          <div className="badge-circle">
            <img src={awsLogo} alt="AWS" className="badge-icon" />
          </div>
          <div className="badge-circle">
            <img src={k8sLogo} alt="Kubernetes" className="badge-icon" />
          </div>
          <div className="badge-circle">
            <img src={vercelLogo} alt="Vercel" className="badge-icon" />
          </div>
          <div className="badge-circle">
            <img src={renderLogo} alt="Render" className="badge-icon" />
          </div>
          <div className="badge-circle">
            <img src={railwayLogo} alt="Railway" className="badge-icon" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
