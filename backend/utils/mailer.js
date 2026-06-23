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

const sendSuspensionEmail = async (email, fullName) => {
  const transporter = getTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CloudPilot" <no-reply@cloudpilot.io>',
    to: email,
    subject: 'CloudPilot Fleet Alert - Account Suspended',
    text: `Hello ${fullName},\n\nWe are writing to inform you that your CloudPilot account has been suspended by an administrator. Please reach out to support if you believe this is in error.`,
    html: `
      <div style="background-color: #030712; color: #ffffff; padding: 40px; font-family: sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <h2 style="color: #ef4444; font-size: 24px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">ACCOUNT SUSPENDED</h2>
        <p style="color: #f1f5f9; font-size: 18px; font-weight: 600; margin-top: 20px;">Hello ${fullName},</p>
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          This message is to notify you that your autonomous fleet integration access for CloudPilot has been <strong>suspended</strong> by a system administrator.
        </p>
        
        <div style="background: rgba(239, 68, 68, 0.04); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="color: #f87171; margin: 0 0 10px 0; font-size: 15px;">What this means:</h4>
          <ul style="color: #94a3b8; font-size: 14px; line-height: 1.7; padding-left: 20px; margin: 0;">
            <li>Your access to the CloudPilot Mission Control dashboard is temporarily restricted.</li>
            <li>Active monitoring schedules and automated optimizations have been paused.</li>
            <li>No data is lost; your resources and analysis configurations remain intact.</li>
          </ul>
        </div>

        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          If you believe this suspension is in error or would like to request reactivation, please contact our support team.
        </p>
        
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 15px; margin-top: 30px;">
          This is an automated system dispatch. Do not reply to this email.
        </p>
      </div>
    `
  };

  if (!transporter) {
    console.log(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | Suspension email logged`);
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('SMTP suspension email dispatch failed. Error:', error.message);
    console.warn('-------- SMTP FAIL FALLBACK --------');
    console.warn(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | Suspension email logged`);
    console.warn('------------------------------------');
  }
};

const sendReactivationEmail = async (email, fullName) => {
  const transporter = getTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CloudPilot" <no-reply@cloudpilot.io>',
    to: email,
    subject: 'CloudPilot Fleet Alert - Account Reactivated',
    text: `Hello ${fullName},\n\nWe are pleased to inform you that your CloudPilot account has been reactivated. You can now log back in at http://localhost:5173.`,
    html: `
      <div style="background-color: #030712; color: #ffffff; padding: 40px; font-family: sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <h2 style="color: #10b981; font-size: 24px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">CLOUDPILOT MISSION CONTROL</h2>
        <p style="color: #f1f5f9; font-size: 18px; font-weight: 600; margin-top: 20px;">Welcome Back, ${fullName}!</p>
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          Your CloudPilot autonomous fleet operator account has been successfully <strong>reactivated</strong> by a system administrator.
        </p>
        
        <div style="background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="color: #34d399; margin: 0 0 10px 0; font-size: 15px;">Your access is fully restored:</h4>
          <ul style="color: #94a3b8; font-size: 14px; line-height: 1.7; padding-left: 20px; margin: 0;">
            <li>You can now log in to the dashboard at http://localhost:5173.</li>
            <li>All active cloud resource integrations are once again accessible.</li>
            <li>Mission logs, tickets, and configurations are ready for use.</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5173/login" style="background-color: #00d4ff; color: #030712; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 6px; box-shadow: 0 4px 15px rgba(0, 212, 255, 0.2); display: inline-block;">
            LOG IN TO ACCOUNT
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 15px; margin-top: 30px;">
          This is an automated system dispatch. Do not reply to this email.
        </p>
      </div>
    `
  };

  if (!transporter) {
    console.log(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | Reactivation email logged`);
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('SMTP reactivation email dispatch failed. Error:', error.message);
    console.warn('-------- SMTP FAIL FALLBACK --------');
    console.warn(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | Reactivation email logged`);
    console.warn('------------------------------------');
  }
};

const sendDeletionEmail = async (email, fullName) => {
  const transporter = getTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CloudPilot" <no-reply@cloudpilot.io>',
    to: email,
    subject: 'CloudPilot Fleet Alert - Account Deleted',
    text: `Hello ${fullName},\n\nWe are writing to inform you that your CloudPilot account has been permanently deleted by an administrator. All your associated data has been purged from our systems.`,
    html: `
      <div style="background-color: #030712; color: #ffffff; padding: 40px; font-family: sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <h2 style="color: #ef4444; font-size: 24px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">ACCOUNT DELETED</h2>
        <p style="color: #f1f5f9; font-size: 18px; font-weight: 600; margin-top: 20px;">Hello ${fullName},</p>
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          This message is to notify you that your autonomous fleet operator account for CloudPilot has been <strong>deleted permanently</strong> by a system administrator.
        </p>
        
        <div style="background: rgba(239, 68, 68, 0.04); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="color: #f87171; margin: 0 0 10px 0; font-size: 15px;">What this means:</h4>
          <ul style="color: #94a3b8; font-size: 14px; line-height: 1.7; padding-left: 20px; margin: 0;">
            <li>Your access credentials have been deactivated and removed.</li>
            <li>All associated tickets, profile metadata, and files have been purged.</li>
            <li>Your subscription plan features are no longer active.</li>
          </ul>
        </div>

        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          Thank you for deploying with CloudPilot. If you believe this action was taken in error, please get in touch with our security administrator.
        </p>
        
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 15px; margin-top: 30px;">
          This is an automated system dispatch. Do not reply to this email.
        </p>
      </div>
    `
  };

  if (!transporter) {
    console.log(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | Deletion email logged`);
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('SMTP deletion email dispatch failed. Error:', error.message);
    console.warn('-------- SMTP FAIL FALLBACK --------');
    console.warn(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | Deletion email logged`);
    console.warn('------------------------------------');
  }
};

const sendPaymentReceiptEmail = async (email, fullName, planName, amount, currency, orderId) => {
  const transporter = getTransporter();
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CloudPilot" <no-reply@cloudpilot.io>',
    to: email,
    subject: `Receipt for your CloudPilot ${planName} Upgrade (Order: ${orderId})`,
    text: `Hello ${fullName},\n\nThank you for upgrading your subscription plan to ${planName}. We have received your payment of ${amount} ${currency} (Order: ${orderId}). Your subscription features are now active.`,
    html: `
      <div style="background-color: #030712; color: #ffffff; padding: 40px; font-family: sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <h2 style="color: #00d4ff; font-size: 24px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 10px; margin-bottom: 20px;">CLOUDPILOT BILLING SYSTEM</h2>
        
        <p style="color: #f1f5f9; font-size: 16px; font-weight: 600; margin-top: 20px;">Hello ${fullName},</p>
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          Your payment has been successfully processed, and your account has been upgraded to the <strong>${planName} Plan</strong>.
        </p>

        <!-- Digital Receipt Box -->
        <div style="background: rgba(0, 212, 255, 0.03); border: 1px solid rgba(0, 212, 255, 0.15); border-radius: 8px; padding: 25px; margin: 25px 0;">
          <h3 style="color: #00d4ff; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid rgba(0, 212, 255, 0.1); padding-bottom: 10px;">Digital Payment Receipt</h3>
          
          <table style="width: 100%; border-collapse: collapse; color: #94a3b8; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #f1f5f9; width: 40%;">Order ID:</td>
              <td style="padding: 6px 0; color: #e2e8f0; font-family: monospace;">${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #f1f5f9;">Date:</td>
              <td style="padding: 6px 0; color: #e2e8f0;">${currentDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #f1f5f9;">Upgrade Tier:</td>
              <td style="padding: 6px 0; color: #e2e8f0; font-weight: bold;">${planName} Plan</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #f1f5f9;">Billing Period:</td>
              <td style="padding: 6px 0; color: #e2e8f0;">Monthly Recurring</td>
            </tr>
            <tr>
              <td style="padding: 15px 0 6px 0; font-weight: bold; color: #00d4ff; font-size: 16px; border-top: 1px solid rgba(0, 212, 255, 0.1);">Total Amount:</td>
              <td style="padding: 15px 0 6px 0; color: #00d4ff; font-size: 16px; font-weight: bold; border-top: 1px solid rgba(0, 212, 255, 0.1);">${amount} ${currency}</td>
            </tr>
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          Your billing dashboard has been updated to reflect this transaction. You can manage integrations, configure analyses, and invoke your AI agent fleet right away.
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5173/dashboard" style="background-color: #00d4ff; color: #030712; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 6px; box-shadow: 0 4px 15px rgba(0, 212, 255, 0.2); display: inline-block;">
            LAUNCH MISSION CONTROL
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 15px; margin-top: 30px;">
          This is an automated payment receipt. Please retain this email for your records. For questions regarding your billing transaction, contact support.
        </p>
      </div>
    `
  };

  if (!transporter) {
    console.log(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | Payment confirmation and receipt email logged`);
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('SMTP receipt email dispatch failed. Error:', error.message);
    console.warn('-------- SMTP FAIL FALLBACK --------');
    console.warn(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | Payment confirmation and receipt email logged`);
    console.warn('------------------------------------');
  }
};

/**
 * Sends an email when a user raises a support ticket, informing them to wait for 2 working days.
 */
const sendTicketOpenedEmail = async (email, fullName, ticketId, subject) => {
  const transporter = getTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CloudPilot Support" <support@cloudpilot.io>',
    to: email,
    subject: `[CloudPilot Support] Ticket Opened: ${ticketId}`,
    text: `Hello ${fullName},\n\nWe have successfully received your support ticket "${subject}" (ID: ${ticketId}). Our support engineers have been notified. Please allow up to 2 working days for our team to inspect the telemetry logs and reply.\n\nThank you,\nCloudPilot Support Fleet`,
    html: `
      <div style="background-color: #030712; color: #ffffff; padding: 40px; font-family: sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <h2 style="color: #00d4ff; font-size: 24px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">CLOUDPILOT SUPPORT</h2>
        <p style="color: #f1f5f9; font-size: 18px; font-weight: 600; margin-top: 20px;">Support Ticket Opened</p>
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          Hello ${fullName},
        </p>
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          We have successfully received your support ticket regarding <strong>${subject}</strong>. Your ticket identifier is <strong>${ticketId}</strong>.
        </p>
        
        <div style="background: rgba(0, 212, 255, 0.04); border: 1px solid rgba(0, 212, 255, 0.15); border-radius: 8px; padding: 20px; margin: 25px 0;">
          <h4 style="color: #00d4ff; margin: 0 0 10px 0; font-size: 15px;">Next steps:</h4>
          <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0;">
            Our support engineers are actively reviewing your case telemetry. <strong>Please allow up to 2 working days</strong> for a full analysis and response from our engineering fleet.
          </p>
        </div>

        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          You can track progress and reply to this ticket directly inside the CloudPilot Console.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5173/support" style="background-color: #00d4ff; color: #030712; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 6px; box-shadow: 0 4px 15px rgba(0, 212, 255, 0.2); display: inline-block;">
            VIEW TICKET TIMELINE
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 15px; margin-top: 30px;">
          This is an automated support dispatch. Please do not reply directly to this email.
        </p>
      </div>
    `
  };

  if (!transporter) {
    console.log(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | Welcome support ticket email logged`);
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('SMTP ticket opened email dispatch failed. Error:', error.message);
    console.warn('-------- SMTP FAIL FALLBACK --------');
    console.warn(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | Welcome support ticket email logged`);
    console.warn('------------------------------------');
  }
};

/**
 * Sends an email to the user when a ticket is closed.
 */
const sendTicketClosedEmail = async (email, fullName, ticketId, subject) => {
  const transporter = getTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || '"CloudPilot Support" <support@cloudpilot.io>',
    to: email,
    subject: `[CloudPilot Support] Ticket Closed: ${ticketId}`,
    text: `Hello ${fullName},\n\nYour support ticket "${subject}" (ID: ${ticketId}) has been successfully marked as resolved and closed. If you have any further questions or if the issue persists, please raise a new ticket in the CloudPilot Console.\n\nThank you,\nCloudPilot Support Fleet`,
    html: `
      <div style="background-color: #030712; color: #ffffff; padding: 40px; font-family: sans-serif; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <h2 style="color: #10b981; font-size: 24px; font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">CLOUDPILOT SUPPORT</h2>
        <p style="color: #f1f5f9; font-size: 18px; font-weight: 600; margin-top: 20px;">Support Ticket Closed</p>
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          Hello ${fullName},
        </p>
        <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
          Your support ticket regarding <strong>${subject}</strong> (ID: <strong>${ticketId}</strong>) has been marked as <strong>resolved & closed</strong>.
        </p>
        
        <div style="background: rgba(16, 185, 129, 0.04); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 8px; padding: 20px; margin: 25px 0;">
          <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0;">
            This ticket is now archived. If you encounter any other anomalies or need additional telemetry analysis, you can raise a new ticket at any time in the Support console.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5173/support" style="background-color: #00d4ff; color: #030712; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 24px; border-radius: 6px; box-shadow: 0 4px 15px rgba(0, 212, 255, 0.2); display: inline-block;">
            LAUNCH SUPPORT CONSOLE
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 15px; margin-top: 30px;">
          This is an automated support dispatch. Please do not reply directly to this email.
        </p>
      </div>
    `
  };

  if (!transporter) {
    console.log(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | Ticket closed email logged`);
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('SMTP ticket closed email dispatch failed. Error:', error.message);
    console.warn('-------- SMTP FAIL FALLBACK --------');
    console.warn(`[MOCK EMAIL] To: ${email} | Subject: ${mailOptions.subject} | Ticket closed email logged`);
    console.warn('------------------------------------');
  }
};

module.exports = {
  sendOtpEmail,
  sendOnboardEmail,
  sendSuspensionEmail,
  sendReactivationEmail,
  sendDeletionEmail,
  sendPaymentReceiptEmail,
  sendTicketOpenedEmail,
  sendTicketClosedEmail
};
