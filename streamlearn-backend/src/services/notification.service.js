const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/email.utils');

const createNotification = async ({ userId, type, title, message, contentId, streamId, channel = 'inapp', actionUrl }) => {
  const notif = await Notification.create({ userId, type, title, message, contentId, streamId, channel, actionUrl });
  return notif;
};

const sendBulkNotification = async (userIds, { type, title, message, channel = 'inapp' }) => {
  const notifications = userIds.map(userId => ({ userId, type, title, message, channel }));
  await Notification.insertMany(notifications);
};

module.exports = { createNotification, sendBulkNotification };
