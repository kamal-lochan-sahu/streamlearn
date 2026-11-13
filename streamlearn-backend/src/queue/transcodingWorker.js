require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const { transcodingQueue } = require('./jobQueue');
const {
  transcodeToHLS,
  collectVideoFiles,
  publishDir,
  removeDir,
  cleanupTemp,
} = require('../services/transcoding.service');
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

    publishDir(workDir, outputDir);
    const update = {
      videoFiles: collectVideoFiles(outputDir),
      duration: Math.round(probe.duration),
      transcodeStatus: 'done',
    };
    // The first finished video publishes the item (as before). A re-upload never changes visibility,
    // so an unpublished title stays unpublished.
    if (firstVideo) update.isActive = true;
    await Model.updateOne({ _id: contentId }, { $set: update, $unset: { transcodeError: 1 } });

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
