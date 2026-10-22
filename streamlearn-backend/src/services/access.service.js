const Content = require('../models/Content');
const { hasPurchasedContent } = require('./subscription.service');
const { ApiError } = require('../utils/ApiError');
const { requireObjectId } = require('../utils/validate.utils');

const STAFF_ROLES = ['owner', 'admin'];
const isStaff = (user) => STAFF_ROLES.includes(user?.role);
// Works for plain ids and for populated documents ({ _id, name, ... })
const idOf = (v) => (v && v._id !== undefined ? v._id : v);
const sameId = (a, b) => Boolean(a && b) && String(idOf(a)) === String(idOf(b));

const allow = () => ({ allowed: true });
const deny = (status, message) => ({ allowed: false, status, message });

const hasActiveSubscription = (user) => {
  const sub = user?.subscription;
  return Boolean(
    sub && sub.status === 'active' && sub.endDate && new Date(sub.endDate) > new Date()
  );
};

/** Staff can manage everything; a creator only the content they own. */
const canManageContent = (user, content) =>
  isStaff(user) || (user?.role === 'creator' && sameId(content?.ownerId, user._id));

const isPublished = (content, now = new Date()) =>
  content.isActive === true &&
  !(content.expiryDate && new Date(content.expiryDate) <= now) &&
  !(content.schedulePublish && new Date(content.schedulePublish) > now);

/**
 * Can this user watch this content? Returns { allowed } or { allowed: false, status, message }.
 * freePreview: the caller already knows this specific item is a free preview, so only the
 * "is it published" part is checked, not the subscription / purchase.
 */
const checkContentAccess = async (user, content, { freePreview = false } = {}) => {
  if (!user) return deny(401, 'Login required');
  if (canManageContent(user, content)) return allow();
  if (!isPublished(content)) return deny(404, 'Content not available');
  if (freePreview) return allow();

  if (content.access === 'free') return allow();
  if (content.access === 'ppv')
    return (await hasPurchasedContent(user._id, content._id))
      ? allow()
      : deny(403, 'Purchase required to watch this content');
  // 'subscribers' and anything unknown: the safe default is to require a subscription
  return hasActiveSubscription(user) ? allow() : deny(403, 'Active subscription required');
};

/** Lecture version: free-preview lectures are watchable by any logged-in user. */
const checkLectureAccess = async (user, lecture, content) => {
  const full = await checkContentAccess(user, content);
  if (full.allowed) return { ...full, full: true };
  if (lecture.isFreePreview) {
    const preview = await checkContentAccess(user, content, { freePreview: true });
    if (preview.allowed) return { ...preview, full: false };
  }
  return { ...full, full: false };
};

const CONTENT_ACCESS_FIELDS = 'ownerId access price isActive expiryDate schedulePublish';

/** Live stream version. audience: all | subscribers | batch (= people who can watch that content). */
const checkLiveAccess = async (user, stream) => {
  if (!user) return deny(401, 'Login required');
  if (isStaff(user) || sameId(stream.ownerId, user._id)) return allow();
  if (stream.audience === 'all') return allow();
  if (stream.audience === 'subscribers')
    return hasActiveSubscription(user) ? allow() : deny(403, 'Active subscription required');
  if (stream.audience === 'batch' && stream.batchId) {
    const content = await Content.findById(stream.batchId).select(CONTENT_ACCESS_FIELDS);
    if (!content) return deny(403, 'Not available');
    return checkContentAccess(user, content);
  }
  return deny(403, 'Not available');
};

/** A creator can run only their own streams; staff can run any. */
const canManageStream = (user, stream) =>
  isStaff(user) || (user?.role === 'creator' && sameId(stream?.ownerId, user._id));

const assertAllowed = (result) => {
  if (!result.allowed) throw new ApiError(result.status || 403, result.message || 'Forbidden');
};

/** Loads a content item the user is allowed to change, or throws 400/404/403. */
const loadManageableContent = async (user, contentId) => {
  requireObjectId(String(contentId), 'content id');
  const content = await Content.findById(contentId);
  if (!content) throw new ApiError(404, 'Content not found');
  if (!canManageContent(user, content))
    throw new ApiError(403, 'You can only manage your own content');
  return content;
};

module.exports = {
  isStaff,
  sameId,
  hasActiveSubscription,
  canManageContent,
  canManageStream,
  checkContentAccess,
  checkLectureAccess,
  checkLiveAccess,
  assertAllowed,
  loadManageableContent,
  CONTENT_ACCESS_FIELDS,
};
