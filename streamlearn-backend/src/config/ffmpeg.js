const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
ffmpeg.setFfmpegPath(ffmpegPath);
module.exports = ffmpeg;
