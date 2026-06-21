const nodemailer = require('nodemailer');

const getTransporter = () => {
  // Validate SMTP configuration
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP configuration is incomplete. Mailer will run in DEV MOCK MODE (logging to console).');
    return null;
  }

  // Gmail app passwords contain spaces, strip them for nodemailer
  const cleanPass = process.env.SMTP_PASS.replace(/\s+/g, '');

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: parseInt(process.env.SMTP_PORT, 10) === 465, // true for port 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: cleanPass
    }
  });
};

/**
 * Sends a 6-digit OTP code to the user's email
 * @param {string} email - Destination email
 * @param {string} otp - 6-digit verification code
 */
const sendOtpEmail = async (email, otp) => {
  const transporter = getTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CloudPilot" <no-reply@cloudpilot.io>',
    to: email,
    subject: 'CloudPilot Mission Control - OTP Verification Code',
    text: `Your OTP verification code for CloudPilot registration is: ${otp}. This code will expire in 15 minutes.`,
    html: `
      <div style="background-color: #030712; color: #ffffff; padding: 40px; font-family: sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <h2 style="color: #00d4ff; font-size: 24px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">CLOUDPILOT MISSION CONTROL</h2>
        <p style="color: #94a3b8; font-size: 16px; line-height: 1.6;">Welcome operator,</p>
        <p style="color: #f1f5f9; font-size: 16px; line-height: 1.6;">
          Your credentials have been validated. To finalize your autonomous cloud fleet access, enter the security authorization key below:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="background-color: rgba(0, 212, 255, 0.05); border: 1px solid #00d4ff; color: #00d4ff; font-size: 32px; font-weight: 800; padding: 12px 28px; border-radius: 8px; letter-spacing: 0.15em; box-shadow: 0 0 15px rgba(0, 212, 255, 0.15);">
            ${otp}
          </span>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 15px;">
          * Note: This key is temporary and will expire in 15 minutes. If you did not request this, please disregard.
        </p>
      </div>
    `
  };

  if (!transporter) {
    console.log(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | OTP: ${otp}`);
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('SMTP email dispatch failed. Check your SMTP settings in backend/.env. Error:', error.message);
    console.warn('-------- SMTP FAIL FALLBACK --------');
    console.warn(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | OTP: ${otp}`);
    console.warn('------------------------------------');
  }
};

/**
 * Sends a welcome onboarding email to the user
 * @param {string} email - User email address
 */
const sendOnboardEmail = async (email) => {
  const transporter = getTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CloudPilot" <no-reply@cloudpilot.io>',
    to: email,
    subject: 'Welcome to CloudPilot, Commander!',
    text: `Welcome aboard! Your session is initialized. Explore the dashboard at http://localhost:5173/dashboard.`,
    html: `
      <div style="background-color: #030712; color: #ffffff; padding: 40px; font-family: sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <h2 style="color: #00d4ff; font-size: 24px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">CLOUDPILOT MISSION CONTROL</h2>
        <p style="color: #f1f5f9; font-size: 18px; font-weight: 600; margin-top: 20px;">Welcome Aboard, Commander!</p>
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          Your autonomous fleet integration is complete. CloudPilot is officially online and monitoring your resources.
        </p>
        
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="color: #f1f5f9; margin: 0 0 10px 0; font-size: 15px;">Next steps to kickstart your mission:</h4>
          <ul style="color: #94a3b8; font-size: 14px; line-height: 1.7; padding-left: 20px; margin: 0;">
            <li>Link your cloud providers (AWS, GCP, Azure) in Repository Analysis.</li>
            <li>Define cloud deployment infrastructure using Terraform or Railway models.</li>
            <li>Start the AI assistant to optimize costs and resources.</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5173/dashboard" style="background-color: #00d4ff; color: #030712; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 6px; box-shadow: 0 4px 15px rgba(0, 212, 255, 0.2); display: inline-block;">
            LAUNCH MISSION CONTROL
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 15px; margin-top: 30px;">
          This is an automated system dispatch. Do not reply to this email. For console assistance, consult our documentation.
        </p>
      </div>
    `
  };

  if (!transporter) {
    console.log(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | Welcome onboarding email logged`);
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('SMTP onboarding email dispatch failed. Check your SMTP settings in backend/.env. Error:', error.message);
    console.warn('-------- SMTP FAIL FALLBACK --------');
    console.warn(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | Welcome onboarding email logged`);
    console.warn('------------------------------------');
  }
};

module.exports = {
  sendOtpEmail,
  sendOnboardEmail
};
