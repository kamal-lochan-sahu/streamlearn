const Content = require('../models/Content');
const Episode = require('../models/Episode');
const Section = require('../models/Section');
const Lecture = require('../models/Lecture');
const Review = require('../models/Review');
const Assignment = require('../models/Assignment');
const Doubt = require('../models/Doubt');
const CourseProgress = require('../models/CourseProgress');
const WatchParty = require('../models/WatchParty');
const Notification = require('../models/Notification');
const LiveStream = require('../models/LiveStream');
const Coupon = require('../models/Coupon');
const Watchlist = require('../models/Watchlist');
const User = require('../models/User');
const { removeVideo } = require('./storage.service');
const { cancelTranscodes } = require('./video.service');

/**
 * Deleting something must not leave dead references behind: other people's watchlists, continue
 * watching rows, course progress, reviews, doubts, files. Payment records (Transaction) are kept on
 * purpose: they are money history and must survive the title that was bought.
 *
 * Order: database first (so nobody can reach the item any more), files last and best effort
 * (a file that cannot be removed is logged and never fails the delete).
 *
 * Arrays of sub-documents are changed with load-modify-save, not `$pull`, because the sandbox
 * database (FerretDB) evaluates `$pull` on sub-documents wrongly (see PROJECT_STATE.md).
 */

const sameId = (a, b) => String(a) === String(b);

/** Users who have the content or episode/lecture in a profile's continue watching or history. */
const cleanProfiles = async ({ contentId, episodeIds = [], lectureIds = [] }) => {
  const or = [];
  if (contentId) {
    or.push({ 'profiles.continueWatching.contentId': contentId });
    or.push({ 'profiles.watchHistory': contentId });
  }
  episodeIds.forEach((id) => or.push({ 'profiles.continueWatching.episodeId': id }));
  lectureIds.forEach((id) => or.push({ 'profiles.continueWatching.lectureId': id }));
  if (!or.length) return 0;

  const users = await User.find({ $or: or });
  let changed = 0;
  for (const user of users) {
    let touched = false;
    for (const profile of user.profiles) {
      const before = profile.continueWatching.length + profile.watchHistory.length;
      profile.continueWatching = profile.continueWatching.filter(
        (c) =>
          !(contentId && sameId(c.contentId, contentId)) &&
          !episodeIds.some((id) => sameId(c.episodeId, id)) &&
          !lectureIds.some((id) => sameId(c.lectureId, id))
      );
      if (contentId)
        profile.watchHistory = profile.watchHistory.filter((id) => !sameId(id, contentId));
      if (before !== profile.continueWatching.length + profile.watchHistory.length) touched = true;
    }
    if (touched) {
      user.markModified('profiles');
      await user.save();
      changed++;
    }
  }
  return changed;
};

/**
 * After lectures of a course are removed: drop them from learners' progress and recompute every
 * learner's percentage of that course (the total changed for everyone, not only for those who had
 * finished the removed lecture). A learner who already got a certificate keeps their percentage.
 */
const cleanProgress = async ({ contentId }) => {
  const rows = await CourseProgress.find({ contentId });
  if (!rows.length) return 0;
  const left = (await Lecture.find({ contentId }).select('_id')).map((l) => String(l._id));
  let changed = 0;
  for (const row of rows) {
    const before = JSON.stringify([
      row.completedLectures,
      row.quizScores,
      row.lastLecture,
      row.completionPercent,
    ]);
    row.completedLectures = row.completedLectures.filter((id) => left.includes(String(id)));
    row.quizScores = row.quizScores.filter((q) => left.includes(String(q.lectureId)));
    if (row.lastLecture && !left.includes(String(row.lastLecture))) {
      row.lastLecture = undefined;
      row.lastTimestamp = 0;
    }
    if (!row.certificateIssued)
      row.completionPercent = left.length
        ? Math.min(100, Math.round((row.completedLectures.length / left.length) * 100))
        : 0;
    const after = JSON.stringify([
      row.completedLectures,
      row.quizScores,
      row.lastLecture,
      row.completionPercent,
    ]);
    if (before !== after) {
      await row.save();
      changed++;
    }
  }
  return changed;
};

/** Deletes a whole title with everything that belongs to it. */
const deleteContentCascade = async (content) => {
  const contentId = content._id;
  const episodeIds = (await Episode.find({ contentId }).select('_id')).map((e) => e._id);
  const lectureIds = (await Lecture.find({ contentId }).select('_id')).map((l) => l._id);

  await Content.deleteOne({ _id: contentId });
  await Promise.all([
    Episode.deleteMany({ contentId }),
    Section.deleteMany({ contentId }),
    Lecture.deleteMany({ contentId }),
    Review.deleteMany({ contentId }),
    Assignment.deleteMany({ contentId }),
    Doubt.deleteMany({ contentId }),
    CourseProgress.deleteMany({ contentId }),
    WatchParty.deleteMany({ contentId }),
    Notification.deleteMany({ contentId }),
    LiveStream.updateMany({ batchId: contentId }, { $unset: { batchId: 1 } }),
  ]);

  for (const coupon of await Coupon.find({ contentIds: contentId })) {
    coupon.contentIds = coupon.contentIds.filter((id) => !sameId(id, contentId));
    await coupon.save();
  }
  for (const list of await Watchlist.find({ 'items.contentId': contentId })) {
    list.items = list.items.filter((i) => !sameId(i.contentId, contentId));
    await list.save();
  }
  await cleanProfiles({ contentId, episodeIds, lectureIds });

  await cancelTranscodes([contentId, ...episodeIds, ...lectureIds]);
  await removeVideo('content', contentId);
  await Promise.all(episodeIds.map((id) => removeVideo('episode', id)));
  await Promise.all(lectureIds.map((id) => removeVideo('lecture', id)));

  return { episodes: episodeIds.length, lectures: lectureIds.length };
};

const deleteEpisodeCascade = async (episode) => {
  await Episode.deleteOne({ _id: episode._id });
  await WatchParty.updateMany({ episodeId: episode._id }, { $unset: { episodeId: 1 } });
  await cleanProfiles({ episodeIds: [episode._id] });
  await cancelTranscodes([episode._id]);
  await removeVideo('episode', episode._id);
};

const deleteLectureCascade = async (lecture) => {
  await Lecture.deleteOne({ _id: lecture._id });
  if (lecture.sectionId)
    await Section.updateOne({ _id: lecture.sectionId }, { $pull: { lectures: lecture._id } });
  await Promise.all([
    Assignment.deleteMany({ lectureId: lecture._id }),
    Doubt.deleteMany({ lectureId: lecture._id }),
  ]);
  await cleanProgress({ contentId: lecture.contentId });
  await cleanProfiles({ lectureIds: [lecture._id] });
  await cancelTranscodes([lecture._id]);
  await removeVideo('lecture', lecture._id);
};

module.exports = { deleteContentCascade, deleteEpisodeCascade, deleteLectureCascade };
