const Settings = require('../models/Settings');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');
const {
  optionalString,
  optionalBoolean,
  optionalInt,
  optionalNumber,
  optionalEnum,
  requireHttpUrl,
  requireText,
} = require('../utils/validate.utils');

const QUALITIES = ['480p', '720p', '1080p', '4K'];
const hexColor = (value, label) => {
  const text = optionalString(value, label, 9);
  if (text !== undefined && !/^#[0-9a-fA-F]{3,8}$/.test(text))
    throw new ApiError(400, `Invalid ${label}`);
  return text;
};
// Text/URL that an admin may also clear (an empty value is stored as '')
const clearable = (value, convert) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return '';
  return convert(value);
};
const text = (label, max) => (value) => clearable(value, (v) => optionalString(v, label, max));
const optionalUrl = (value, label) => clearable(value, (v) => requireHttpUrl(v, label));
const bool = (label) => (value) => optionalBoolean(value, label);

/**
 * Every setting an admin may change, with its validator. Unknown keys in a request are ignored
 * (never written), so a request cannot touch `ownerId` or invent new fields.
 */
const SPEC = {
  platform: {
    name: (v) => (v === undefined ? undefined : requireText(v, 'Platform name', 60)),
    logo: (v) => optionalUrl(v, 'Logo URL'),
    favicon: (v) => optionalUrl(v, 'Favicon URL'),
    primaryColor: (v) => hexColor(v, 'primaryColor'),
    secondaryColor: (v) => hexColor(v, 'secondaryColor'),
    domain: text('Domain', 100),
    tagline: text('Tagline', 150),
  },
  features: Object.fromEntries(
    [
      'ottMode',
      'educationMode',
      'liveStreaming',
      'downloads',
      'community',
      'watchParty',
      'dppSystem',
      'certificate',
      'ppv',
      'subscription',
      'freeContent',
      'kidsProfile',
      'multiLanguage',
      'adsEnabled',
    ].map((key) => [key, bool(key)])
  ),
  payment: {
    razorpayEnabled: bool('razorpayEnabled'),
    stripeEnabled: bool('stripeEnabled'),
    currency: (v) => optionalEnum(v, ['INR', 'USD', 'EUR', 'GBP'], 'currency'),
    gstEnabled: bool('gstEnabled'),
    gstPercent: (v) => optionalNumber(v, 'gstPercent', 0, 100),
  },
  streaming: {
    defaultQuality: (v) => optionalEnum(v, QUALITIES, 'defaultQuality'),
    maxQuality: (v) => optionalEnum(v, QUALITIES, 'maxQuality'),
    downloadExpiry: (v) => optionalInt(v, 'downloadExpiry', 1, 365),
    watermarkEnabled: bool('watermarkEnabled'),
  },
  notifications: {
    subExpiryDays: (v) => optionalInt(v, 'subExpiryDays', 1, 60),
    newContentAlert: bool('newContentAlert'),
    liveReminder: bool('liveReminder'),
    whatsappEnabled: bool('whatsappEnabled'),
  },
  seo: {
    metaTitle: text('metaTitle', 100),
    metaDescription: text('metaDescription', 300),
    googleAnalyticsId: text('googleAnalyticsId', 40),
    facebookPixel: text('facebookPixel', 40),
  },
};

/** Validated { 'section.field': value } for one section of the body. Only known fields, only given ones. */
const sectionUpdate = (section, body) => {
  if (body === undefined) return {};
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ApiError(400, `${section} must be an object`);
  const out = {};
  for (const [field, validate] of Object.entries(SPEC[section])) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
    const value = validate(body[field]);
    if (value !== undefined) out[`${section}.${field}`] = value;
  }
  return out;
};

/**
 * Settings are platform-wide: there is one document. The first admin who saves creates it,
 * later saves (by any admin) update that same document.
 */
const saveSettings = async (userId, set) => {
  if (!Object.keys(set).length) throw new ApiError(400, 'Nothing to update');
  return Settings.findOneAndUpdate(
    {},
    { $set: set, $setOnInsert: { ownerId: userId } },
    { new: true, upsert: true, sort: { createdAt: 1 }, runValidators: true }
  );
};

const STAFF = ['owner', 'admin'];

// Admins get everything. Everyone else only gets what the storefront needs (branding + feature flags).
exports.get = asyncHandler(async (req, res) => {
  const settings = await Settings.findOne().sort({ createdAt: 1 });
  if (STAFF.includes(req.user?.role)) {
    return res.json(new ApiResponse(200, settings || new Settings({ ownerId: req.user._id })));
  }
  const defaults = new Settings({ ownerId: req.user._id });
  const source = settings || defaults;
  res.json(new ApiResponse(200, { platform: source.platform, features: source.features }));
});

// PUT /settings  { platform: {...}, features: {...}, payment: {...}, ... }  (any subset)
exports.update = asyncHandler(async (req, res) => {
  const set = {};
  for (const section of Object.keys(SPEC))
    Object.assign(set, sectionUpdate(section, req.body?.[section]));
  const settings = await saveSettings(req.user._id, set);
  res.json(new ApiResponse(200, settings, 'Settings updated'));
});

const sectionHandler = (section, message) =>
  asyncHandler(async (req, res) => {
    const settings = await saveSettings(req.user._id, sectionUpdate(section, req.body));
    res.json(new ApiResponse(200, settings[section], message));
  });

exports.updateBranding = sectionHandler('platform', 'Branding updated');
exports.updateFeatures = sectionHandler('features', 'Features updated');
exports.updatePayment = sectionHandler('payment', 'Payment settings updated');
exports.updateStreaming = sectionHandler('streaming', 'Streaming settings updated');
