const nodemailer = require('nodemailer');

/**
 * EMAIL_DRIVER=smtp     real emails through SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS.
 * EMAIL_DRIVER=console  nothing is sent; the message (OTP code, reset link...) is printed in the server log.
 *                       For hosts that block SMTP (Render free) and for local development.
 * Not set: "smtp" when SMTP_HOST is set, otherwise "console".
 */
const emailDriver = () => {
  const wanted = String(process.env.EMAIL_DRIVER || '').toLowerCase();
  if (wanted === 'smtp' || wanted === 'console') return wanted;
  return process.env.SMTP_HOST ? 'smtp' : 'console';
};

let transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  transporter.verify((err) => {
    if (err) console.warn('⚠️  Email not configured:', err.message);
    else console.log('✅ Email transporter ready');
  });
  return transporter;
};

module.exports = { emailDriver, getTransporter };
