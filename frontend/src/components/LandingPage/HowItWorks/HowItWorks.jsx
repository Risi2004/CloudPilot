import React from 'react';
import './HowItWorks.css';

function HowItWorks() {
  const steps = [
    {
      num: '1',
      title: 'Submit URL',
      desc: 'Input a public GitHub URL of your codebase.'
    },
    {
      num: '2',
      title: 'Analyze Project',
      desc: 'AI scans structural logs and packages to catalog libraries.'
    },
    {
      num: '3',
      title: 'Generate Recommendations',
      desc: 'Receive tailored host configs for Vercel & Render, plus cost estimates.'
    },
    {
      num: '4',
      title: 'Deploy Code',
      desc: 'Follow step-by-step instructions and deploy to production.'
    }
  ];

  return (
    <section className="how-it-works" id="how-it-works">
      <div className="section-container">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">Get from repository to deployed production cloud hosting in minutes.</p>
        
        <div className="steps-container">
          {steps.map((step, idx) => (
            <div className="step-card" key={idx}>
              <div className="step-number-circle">
                <span className="step-number">{step.num}</span>
              </div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
