const path = require('path');
const Content = require('../models/Content');
const Episode = require('../models/Episode');
const Lecture = require('../models/Lecture');
const { transcodingQueue } = require('../queue/jobQueue');
const { probeFile } = require('../utils/ffmpeg.utils');
const { hlsRoot, hlsDirName } = require('../utils/paths.utils');
const { ApiError } = require('../utils/ApiError');

const MODELS = { content: Content, episode: Episode, lecture: Lecture };
const RUNNING_STATES = ['waiting', 'active', 'delayed', 'paused'];

/** True when the transcode job is really still queued or running (a crashed one must not block re-uploads). */
const isJobRunning = async (jobId) => {
  if (!jobId) return false;
  const job = await transcodingQueue.getJob(jobId);
  return job ? RUNNING_STATES.includes(await job.getState()) : false;
};

/**
 * The one place that turns an uploaded video file into a transcode job, for movies, episodes and lectures.
 * 1. refuses when a video for this item is already being processed (two jobs would write the same folder)
 * 2. ffprobes the file, so something that is not a video is refused right away with a clear message
 * 3. marks the item as processing and queues the job
 * The caller owns the temp file until this returns: delete it when this throws.
 */
const queueTranscode = async ({ model, id, file, ownerId }) => {
  const Model = MODELS[model];
  if (!Model) throw new ApiError(400, 'Invalid model');

  const doc = await Model.findById(id).select('transcodeStatus transcodeJobId');
  if (!doc) throw new ApiError(404, `${model} not found`);
  if (doc.transcodeStatus === 'processing' && (await isJobRunning(doc.transcodeJobId)))
    throw new ApiError(
      409,
      'A video for this item is still being processed. Wait until it finishes, then upload again.'
    );

  const probe = await probeFile(file.path);

  // Status first, job second: a very fast worker must never be overwritten by a late "processing".
  const previousStatus = doc.transcodeStatus;
  await Model.updateOne(
    { _id: id },
    { $set: { transcodeStatus: 'processing' }, $unset: { transcodeError: 1 } }
  );
  let job;
  try {
    job = await transcodingQueue.add({
      inputPath: file.path,
      outputDir: path.join(hlsRoot(), hlsDirName(model, id)),
      contentId: String(id),
      model,
      ownerId: ownerId ? String(ownerId) : undefined,
      probe: {
        duration: probe.duration,
        width: probe.width,
        height: probe.height,
        hasAudio: probe.hasAudio,
      },
    });
  } catch (err) {
    await Model.updateOne({ _id: id }, { $set: { transcodeStatus: previousStatus } });
    throw err;
  }
  await Model.updateOne({ _id: id }, { $set: { transcodeJobId: String(job.id) } });

  return { jobId: job.id, probe };
};

module.exports = { queueTranscode, isJobRunning, MODELS };
