const cron = require('node-cron');
const User = require('../models/User');
const { sendSubExpiryEmail } = require('../utils/email.utils');

// Run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('⏰ Running subscription expiry check...');
  const daysToCheck = [7, 3, 1];

  for (const days of daysToCheck) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));

    const users = await User.find({
      'subscription.status': 'active',
      'subscription.endDate': { $gte: start, $lte: end },
    });

    for (const user of users) {
      sendSubExpiryEmail(user, days).catch(console.error);
    }
    console.log(`  Sent expiry reminders for ${users.length} users (${days} days)`);
  }
});

console.log('✅ Sub expiry cron registered');
