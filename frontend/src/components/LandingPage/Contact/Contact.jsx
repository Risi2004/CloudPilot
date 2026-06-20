import React, { useState } from 'react';
import './Contact.css';

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Identifier name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid encryption email address format';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Contact number is required';
    if (!formData.message.trim()) newErrors.message = 'Transmission message content is required';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
    } else {
      setIsSubmitted(true);
      setFormData({ name: '', email: '', phone: '', company: '', message: '' });
      setErrors({});
    }
  };

  return (
    <section className="contact-section" id="contact">
      <div className="contact-container">
        
        <div className="contact-header">
          <div className="contact-status">
            <span className="contact-status-dot"></span>
            <span className="contact-status-text">SECURE UPLINK ACTIVE</span>
          </div>
          <h2 className="contact-title">Contact Fleet Control</h2>
          <p className="contact-subtitle">
            Have questions about our autonomous cloud engine? Establish a message with our engineering team.
          </p>
        </div>

        <div className="contact-card-wrapper">
          {isSubmitted ? (
            <div className="contact-success-state">
              <div className="success-icon-wrapper">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="success-svg">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3 className="success-title">Transmission Broadcasted</h3>
              <p className="success-message">
                Your secure payload has been successfully queued. Our fleet support team will respond shortly.
              </p>
              <button onClick={() => setIsSubmitted(false)} className="success-btn">
                Establish New Uplink
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form" noValidate>
              
              <div className="contact-grid">
                
                {/* Name field */}
                <div className="contact-input-group">
                  <label htmlFor="name" className="contact-label">NAME IDENTIFIER</label>
                  <div className={`contact-input-container ${errors.name ? 'input-error' : ''}`}>
                    <div className="contact-icon-prefix">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      placeholder="e.g. Commander Risi"
                      value={formData.name}
                      onChange={handleChange}
                      className="contact-input-element"
                    />
                  </div>
                  {errors.name && <span className="contact-error-msg">{errors.name}</span>}
                </div>

                {/* Email field */}
                <div className="contact-input-group">
                  <label htmlFor="email" className="contact-label">EMAIL ADDRESS</label>
                  <div className={`contact-input-container ${errors.email ? 'input-error' : ''}`}>
                    <div className="contact-icon-prefix">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </div>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="e.g. risi@cloudpilot.ai"
                      value={formData.email}
                      onChange={handleChange}
                      className="contact-input-element"
                    />
                  </div>
                  {errors.email && <span className="contact-error-msg">{errors.email}</span>}
                </div>

                {/* Phone field */}
                <div className="contact-input-group">
                  <label htmlFor="phone" className="contact-label">CONTACT NUMBER</label>
                  <div className={`contact-input-container ${errors.phone ? 'input-error' : ''}`}>
                    <div className="contact-icon-prefix">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                      </svg>
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      placeholder="e.g. +1 (555) 019-2834"
                      value={formData.phone}
                      onChange={handleChange}
                      className="contact-input-element"
                    />
                  </div>
                  {errors.phone && <span className="contact-error-msg">{errors.phone}</span>}
                </div>

                {/* Company Name (Optional) field */}
                <div className="contact-input-group">
                  <label htmlFor="company" className="contact-label">COMPANY NAME (OPTIONAL)</label>
                  <div className="contact-input-container">
                    <div className="contact-icon-prefix">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      placeholder="e.g. CloudPilot Inc."
                      value={formData.company}
                      onChange={handleChange}
                      className="contact-input-element"
                    />
                  </div>
                </div>

                {/* Message field */}
                <div className="contact-input-group contact-message-group">
                  <label htmlFor="message" className="contact-label">MESSAGE</label>
                  <div className={`contact-input-container contact-textarea-container ${errors.message ? 'input-error' : ''}`}>
                    <div className="contact-icon-prefix contact-textarea-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                    </div>
                    <textarea
                      id="message"
                      name="message"
                      placeholder="Enter the transmission details..."
                      value={formData.message}
                      onChange={handleChange}
                      className="contact-input-element contact-textarea-element"
                      rows="4"
                    />
                  </div>
                  {errors.message && <span className="contact-error-msg">{errors.message}</span>}
                </div>

              </div>

              <button type="submit" className="contact-submit-btn">
                <span>Submit</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="submit-arrow">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>

            </form>
          )}
        </div>

      </div>
    </section>
  );
}

export default Contact;
