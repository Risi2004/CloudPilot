import React from 'react';
import './Integrations.css';
import awsLogo from '../../../assets/aws.svg';
import k8sLogo from '../../../assets/kubernetes.svg';
import vercelLogo from '../../../assets/vercel.svg';
import renderLogo from '../../../assets/render.svg';
import railwayLogo from '../../../assets/railway.svg';

function Integrations() {
  const integrations = [
    { name: 'AWS Cloud', logo: awsLogo },
    { name: 'Kubernetes', logo: k8sLogo },
    { name: 'Kubernetes', logo: k8sLogo },
    { name: 'Vercel Edge', logo: vercelLogo },
    { name: 'Render', logo: renderLogo },
    { name: 'Railway', logo: railwayLogo }
  ];

  return (
    <section className="integrations">
      <div className="section-container">
        <h3 className="integrations-title">SEAMLESS INTEGRATION WITH YOUR STACK</h3>
        
        <div className="integrations-grid">
          {integrations.map((item, idx) => (
            <div className="integration-badge" key={idx}>
              <img src={item.logo} alt={item.name} className="integration-icon" />
              <span className="integration-name">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Integrations;
