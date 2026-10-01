require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { notificationQueue } = require('./jobQueue');
const { sendEmail } = require('../utils/email.utils');
const { connectDB } = require('../config/db');

connectDB();

notificationQueue.process(async (job) => {
  const { type, payload } = job.data;
  console.log(`Processing notification job: ${type}`);
  // TODO: handle different notification types (email, push, whatsapp)
  if (type === 'email') {
    await sendEmail(payload);
  }
});

console.log('🔔 Notification worker started...');
