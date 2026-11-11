const User = require('../models/User');
const Content = require('../models/Content');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');

const MAX_ROWS = 50000;

/**
 * One CSV cell. Text that starts with = + - @ (or a tab / CR) would be run as a formula by
 * Excel and Sheets, so it gets a leading apostrophe. Names and titles come from users.
 */
const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const csvLine = (cells) => `${cells.map(csvCell).join(',')}\r\n`;

const id = (v) => (v ? String(v._id || v) : '');

// type -> how to read the rows. `since` applies to the creation date where it makes sense.
const EXPORTS = {
  transactions: {
    query: (since) => Transaction.find({ createdAt: { $gte: since } }).populate('userId', 'email'),
    columns: [
      ['Date', (t) => t.createdAt],
      ['Transaction id', (t) => id(t)],
      ['User email', (t) => t.userId?.email],
      ['Type', (t) => t.type],
      ['Gateway', (t) => t.gateway],
      ['Status', (t) => t.status],
      ['Amount', (t) => t.amount],
      ['Currency', (t) => t.currency],
      ['Discount', (t) => t.discountAmount],
      ['Coupon', (t) => t.couponCode],
      ['Billing cycle', (t) => t.billingCycle],
    ],
  },
  subscriptions: {
    query: (since) =>
      Subscription.find({ createdAt: { $gte: since } })
        .populate('userId', 'email')
        .populate('planId', 'name'),
    columns: [
      ['Created', (s) => s.createdAt],
      ['User email', (s) => s.userId?.email],
      ['Plan', (s) => s.planId?.name],
      ['Status', (s) => s.status],
      ['Billing cycle', (s) => s.billingCycle],
      ['Start', (s) => s.startDate],
      ['End', (s) => s.endDate],
      ['Auto renew', (s) => s.autoRenew],
      ['Cancelled at', (s) => s.cancelledAt],
    ],
  },
  users: {
    query: (since) =>
      User.find({ createdAt: { $gte: since } }).select('-password -refreshToken -otp'),
    columns: [
      ['Joined', (u) => u.createdAt],
      ['Name', (u) => u.name],
      ['Email', (u) => u.email],
      ['Role', (u) => u.role],
      ['Active', (u) => u.isActive],
      ['Subscription', (u) => u.subscription?.status],
      ['Subscription ends', (u) => u.subscription?.endDate],
    ],
  },
  content: {
    query: () => Content.find({}).select('-videoFiles'),
    columns: [
      ['Created', (c) => c.createdAt],
      ['Title', (c) => c.title],
      ['Type', (c) => c.type],
      ['Access', (c) => c.access],
      ['Price', (c) => c.price],
      ['Published', (c) => c.isActive],
      ['Views', (c) => c.viewCount],
      ['Rating', (c) => c.rating?.average],
      ['Ratings count', (c) => c.rating?.count],
    ],
  },
};

/** Streams the CSV to the response, row by row (nothing is held in memory). */
const streamCsv = async (res, type, since) => {
  const def = EXPORTS[type];
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="streamlearn-${type}-${stamp}.csv"`);
  res.write('﻿'); // lets Excel read UTF-8 names correctly
  res.write(csvLine(def.columns.map(([header]) => header)));
  const cursor = def.query(since).sort('-createdAt').limit(MAX_ROWS).lean().cursor();
  for await (const doc of cursor) res.write(csvLine(def.columns.map(([, read]) => read(doc))));
  res.end();
};

module.exports = { EXPORT_TYPES: Object.keys(EXPORTS), streamCsv, csvCell };
