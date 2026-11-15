require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const { transcodingQueue } = require('./jobQueue');
const { transcodeToHLS, removeDir, cleanupTemp } = require('../services/transcoding.service');
const storage = require('../services/storage.service');
const { MODELS } = require('../services/video.service');
const { probeFile } = require('../utils/ffmpeg.utils');
const { connectDB } = require('../config/db');

connectDB();

// What the admin sees as the reason: short, and without server paths.
const friendlyError = (err, job) => {
  let text = String(err?.message || err || 'Transcoding failed');
  [job.data.inputPath, job.data.outputDir].filter(Boolean).forEach((p) => {
    text = text.split(p).join('<file>');
  });
  return text.slice(0, 300);
};

transcodingQueue.process(async (job) => {
  const { inputPath, outputDir, contentId, model } = job.data;
  const Model = MODELS[model];
  if (!Model) {
    job.discard();
    throw new Error(`Unknown video model: ${model}`);
  }
  console.log(`Processing job ${job.id}: ${contentId} [${model}]`);

  // Made next to the final folder and swapped in only when everything worked
  const workDir = `${outputDir}.new-${job.id}`;
  try {
    if (!fs.existsSync(inputPath)) {
      job.discard(); // retrying cannot bring the file back
      throw new Error('The uploaded file is no longer on the server. Upload the video again.');
    }
    const probe = job.data.probe || (await probeFile(inputPath));

    await transcodeToHLS(inputPath, workDir, {
      probe,
      onProgress: (percent) => job.progress(Math.floor(percent)),
    });

    const doc = await Model.findById(contentId).select('videoFiles');
    if (!doc) {
      // the title was deleted while its video was being processed
      removeDir(workDir);
      cleanupTemp(inputPath);
      return { success: false, reason: 'deleted' };
    }
    const firstVideo = !doc.videoFiles?.master;

    // Puts the finished files in their final place (disk, or a new version in the bucket) and removes
    // workDir. The old video is not touched yet: the item still points at it.
    const { videoFiles, version } = await storage.publishVideo({
      model,
      id: contentId,
      workDir,
      version: job.id,
    });
    const update = {
      videoFiles,
      duration: Math.round(probe.duration),
      transcodeStatus: 'done',
    };
    // The first finished video publishes the item (as before). A re-upload never changes visibility,
    // so an unpublished title stays unpublished.
    if (firstVideo) update.isActive = true;
    const unset = { transcodeError: 1 };
    if (version) update.videoVersion = version;
    else unset.videoVersion = 1;
    const written = await Model.updateOne({ _id: contentId }, { $set: update, $unset: unset });
    if (!written.matchedCount) {
      // deleted in the short time between the check above and now: nothing may stay behind
      await storage.removeVideo(model, contentId);
      cleanupTemp(inputPath);
      return { success: false, reason: 'deleted' };
    }
    await storage.pruneOldVersions(model, contentId, version); // the item points to the new copy now

    cleanupTemp(inputPath);
    console.log(`✅ Transcoding done: ${contentId}`);
    return { success: true, videoFiles: update.videoFiles };
  } catch (err) {
    removeDir(workDir);
    // attemptsMade counts the tries that already failed, so this try is number attemptsMade + 1
    const isLastTry = job.attemptsMade + 1 >= (job.opts.attempts || 1) || job.isDiscarded();
    if (isLastTry) {
      // Only the last try marks the item failed; while retries remain it keeps showing "processing".
      await Model.updateOne(
        { _id: contentId },
        { $set: { transcodeStatus: 'failed', transcodeError: friendlyError(err, job) } }
      );
      cleanupTemp(inputPath);
    }
    throw err;
  }
});

console.log('🎬 Transcoding worker started — listening for jobs...');
