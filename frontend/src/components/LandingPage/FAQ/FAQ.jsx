import React, { useState } from 'react';
import './FAQ.css';

function FAQ() {
  const [activeIndex, setActiveIndex] = useState(null);

  const faqs = [
    {
      q: 'What is CloudPilot?',
      a: 'CloudPilot is an AI-powered autonomous cloud engineer that analyzes your codebase, recommends infrastructure, automates deployments, monitors applications, and helps manage cloud operations.'
    },
    {
      q: 'How does CloudPilot work?',
      a: 'Simply connect your GitHub repository. CloudPilot analyzes your project, recommends the best deployment strategy, generates infrastructure configurations, and guides or automates the deployment process.'
    },
    {
      q: 'Which cloud providers does CloudPilot support?',
      a: 'CloudPilot supports major cloud platforms including AWS, Vercel, Render, Railway, Netlify, and additional providers through future integrations.'
    },
    {
      q: 'Do I need DevOps experience to use CloudPilot?',
      a: 'No. CloudPilot is designed for startups, student founders, and development teams who may not have dedicated cloud engineers.'
    },
    {
      q: 'How does the AI choose the best deployment platform?',
      a: 'CloudPilot evaluates your application\'s architecture, frameworks, scalability requirements, performance needs, and estimated costs to recommend the most suitable platform.'
    },
    {
      q: 'Is my source code secure?',
      a: 'Yes. Repository analysis is performed securely, credentials are encrypted, and your code is not used to train AI models.'
    },
    {
      q: 'Can CloudPilot monitor my application after deployment?',
      a: 'Yes. CloudPilot continuously monitors system health, performance metrics, uptime, logs, and incidents to help maintain reliability.'
    },
    {
      q: 'How does CloudPilot reduce cloud costs?',
      a: 'CloudPilot analyzes infrastructure usage and recommends optimizations such as right-sizing resources, removing unused services, and selecting cost-effective deployment options.'
    },
    {
      q: 'Can CloudPilot automatically fix issues?',
      a: 'CloudPilot can detect incidents, identify root causes, recommend solutions, and automate selected recovery actions depending on configuration and approval settings.'
    },
    {
      q: 'Who is CloudPilot built for?',
      a: 'CloudPilot is designed for startups, SaaS founders, freelancers, student developers, and growing engineering teams looking to simplify cloud operations.'
    }
  ];

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="faq" id="faq">
      <div className="section-container">
        <h2 className="section-title">Frequently Asked Questions</h2>
        <p className="section-subtitle">Have questions? We have answers.</p>
        
        <div className="faq-list">
          {faqs.map((faq, index) => {
            const isOpen = activeIndex === index;
            return (
              <div className={`faq-item ${isOpen ? 'open' : ''}`} key={index}>
                <button className="faq-question" onClick={() => toggleFAQ(index)}>
                  <span className="faq-question-text">{index + 1}. {faq.q}</span>
                  <span className="faq-icon-wrapper">
                    <svg className="faq-arrow-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 9L12 15L18 9" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
                <div className="faq-answer-container">
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FAQ;
