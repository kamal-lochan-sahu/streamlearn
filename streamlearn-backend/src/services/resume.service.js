const CourseProgress = require('../models/CourseProgress');

/**
 * Where should playback continue? Everything here is read-only and per user.
 *  - movies, shorts, series episodes: the "continue watching" entry of the ACTIVE profile
 *  - course lectures: the course progress record (last lecture + timestamp)
 */

const activeProfile = (user) => user?.profiles?.[user.activeProfile || 0] || null;

const sameId = (a, b) => Boolean(a && b) && String(a) === String(b);

/** The continue-watching entry of the active profile for this title, or null. */
const continueEntry = (user, contentId) =>
  activeProfile(user)?.continueWatching?.find((c) => sameId(c.contentId, contentId)) || null;

/** Seconds to start from for a movie/short/documentary (0 = from the start). */
const contentResumeAt = (user, contentId) => {
  const entry = continueEntry(user, contentId);
  return entry && !entry.episodeId && !entry.lectureId ? entry.timestamp || 0 : 0;
};

/** Seconds to start from for one episode. Another episode in the entry means 0. */
const episodeResumeAt = (user, contentId, episodeId) => {
  const entry = continueEntry(user, contentId);
  return entry && sameId(entry.episodeId, episodeId) ? entry.timestamp || 0 : 0;
};

/** Seconds to start from for one lecture. */
const lectureResumeAt = async (user, contentId, lectureId) => {
  const progress = await CourseProgress.findOne({ userId: user._id, contentId }).select(
    'lastLecture lastTimestamp'
  );
  return progress && sameId(progress.lastLecture, lectureId) ? progress.lastTimestamp || 0 : 0;
};

/** What the detail page needs to show "Resume": which episode/lecture and how far. */
const resumeInfo = async (user, content) => {
  if (content.type === 'course') {
    const progress = await CourseProgress.findOne({ userId: user._id, contentId: content._id });
    return {
      lectureId: progress?.lastLecture || null,
      timestamp: progress?.lastTimestamp || 0,
      completionPercent: progress?.completionPercent || 0,
    };
  }
  const entry = continueEntry(user, content._id);
  return {
    episodeId: entry?.episodeId || null,
    timestamp: entry?.timestamp || 0,
    completionPercent: 0,
  };
};

module.exports = {
  continueEntry,
  contentResumeAt,
  episodeResumeAt,
  lectureResumeAt,
  resumeInfo,
};
