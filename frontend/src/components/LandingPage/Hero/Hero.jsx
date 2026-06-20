import React from 'react';
import './Hero.css';
import awsLogo from '../../../assets/aws.svg';
import k8sLogo from '../../../assets/kubernetes.svg';
import vercelLogo from '../../../assets/vercel.svg';
import renderLogo from '../../../assets/render.svg';
import railwayLogo from '../../../assets/railway.svg';

function Hero() {
  return (
    <section className="hero">
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
          <button className="cta-primary">Initialize Engine</button>
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
