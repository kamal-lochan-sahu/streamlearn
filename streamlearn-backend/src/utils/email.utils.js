const transporter = require('../config/email');

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'StreamLearn <noreply@streamlearn.com>',
      to, subject, html, text,
    });
    return info;
  } catch (err) {
    // Don't throw — email is non-critical, log and continue
    console.warn('⚠️  Email send failed:', err.message);
    return null;
  }
};

const sendWelcomeEmail = (user) => sendEmail({
  to: user.email,
  subject: 'Welcome to StreamLearn!',
  html: `<div style="font-family:Inter,sans-serif;background:#141414;color:#fff;padding:40px;border-radius:12px">
    <h1 style="color:#e50914">Welcome, ${user.name}! 🎬</h1>
    <p>Your account is ready. Start streaming and learning today.</p>
  </div>`,
});

const sendOTPEmail = (email, otp) => sendEmail({
  to: email,
  subject: 'Your OTP — StreamLearn',
  html: `<div style="font-family:Inter,sans-serif;background:#141414;color:#fff;padding:40px;border-radius:12px">
    <h2>Your verification code</h2>
    <div style="font-size:48px;font-weight:900;color:#e50914;letter-spacing:8px;margin:20px 0">${otp}</div>
    <p style="color:#b3b3b3">Valid for 10 minutes. Do not share this code.</p>
  </div>`,
});

const sendPasswordResetEmail = (email, resetUrl) => sendEmail({
  to: email,
  subject: 'Reset your password — StreamLearn',
  html: `<div style="font-family:Inter,sans-serif;background:#141414;color:#fff;padding:40px;border-radius:12px">
    <h2>Password Reset</h2>
    <p>Click the button below to reset your password. Link expires in 1 hour.</p>
    <a href="${resetUrl}" style="display:inline-block;background:#e50914;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin:20px 0">Reset Password</a>
    <p style="color:#b3b3b3;font-size:12px">If you didn't request this, ignore this email.</p>
  </div>`,
});

const sendSubExpiryEmail = (user, daysLeft) => sendEmail({
  to: user.email,
  subject: `Your subscription expires in ${daysLeft} day(s) — StreamLearn`,
  html: `<div style="font-family:Inter,sans-serif;background:#141414;color:#fff;padding:40px;border-radius:12px">
    <h2>Hi ${user.name},</h2>
    <p>Your subscription expires in <strong style="color:#e50914">${daysLeft} day(s)</strong>.</p>
    <a href="${process.env.CLIENT_URL}/subscription" style="display:inline-block;background:#e50914;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin:20px 0">Renew Now</a>
  </div>`,
});

const sendPaymentConfirmEmail = (user, amount) => sendEmail({
  to: user.email,
  subject: 'Payment confirmed — StreamLearn',
  html: `<div style="font-family:Inter,sans-serif;background:#141414;color:#fff;padding:40px;border-radius:12px">
    <h2>Payment confirmed! ✓</h2>
    <p>₹${amount} received. Your subscription is now active.</p>
  </div>`,
});

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendSubExpiryEmail,
  sendPaymentConfirmEmail,
};
