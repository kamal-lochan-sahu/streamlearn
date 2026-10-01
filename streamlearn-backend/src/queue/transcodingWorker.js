require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const { transcodingQueue } = require('./jobQueue');
const { transcodeToHLS, uploadHLSToCloudinary, cleanupTemp } = require('../services/transcoding.service');
const Content  = require('../models/Content');
const Episode  = require('../models/Episode');
const Lecture  = require('../models/Lecture');
const { connectDB } = require('../config/db');

connectDB();

transcodingQueue.process(async (job) => {
  const { inputPath, outputDir, contentId, type, model } = job.data;
  console.log(`Processing job ${job.id}: ${contentId} [${model}]`);

  try {
    await transcodeToHLS(inputPath, outputDir, (percent) => {
      job.progress(Math.floor(percent));
    });

    const videoFiles = await uploadHLSToCloudinary(outputDir, contentId);

    const ModelMap = { content: Content, episode: Episode, lecture: Lecture };
    const Model = ModelMap[model] || Content;
    await Model.findByIdAndUpdate(contentId, { videoFiles, transcodeStatus: 'done', isActive: true });

    cleanupTemp(inputPath);
    console.log(`✅ Transcoding done: ${contentId}`);
    return { success: true, videoFiles };
  } catch (err) {
    const ModelMap = { content: Content, episode: Episode, lecture: Lecture };
    const Model = ModelMap[model] || Content;
    await Model.findByIdAndUpdate(contentId, { transcodeStatus: 'failed' });
    throw err;
  }
});

console.log('🎬 Transcoding worker started — listening for jobs...');
