const ffmpeg = require('../config/ffmpeg');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

const QUALITIES = [
  { name: '480p', size: '854x480', bitrate: '800k', maxrate: '856k', bufsize: '1200k' },
  { name: '720p', size: '1280x720', bitrate: '2800k', maxrate: '2996k', bufsize: '4200k' },
  { name: '1080p', size: '1920x1080', bitrate: '5000k', maxrate: '5350k', bufsize: '7500k' },
];

/**
 * Transcode a video to HLS multi-quality
 * @param {string} inputPath - path to uploaded video
 * @param {string} outputDir  - directory for HLS output
 * @param {function} onProgress - progress callback (0-100)
 */
const transcodeToHLS = (inputPath, outputDir, onProgress = () => {}) => {
  return new Promise((resolve, reject) => {
    const segmentPath = path.join(outputDir, '%v', 'segment%03d.ts');
    const manifestPath = path.join(outputDir, '%v', 'index.m3u8');
    const masterPath = path.join(outputDir, 'master.m3u8');

    QUALITIES.forEach((q) => fs.mkdirSync(path.join(outputDir, q.name), { recursive: true }));

    const command = ffmpeg(inputPath)
      .outputOptions([
        '-preset fast',
        '-g 48',
        '-sc_threshold 0',
        '-map 0:v:0',
        '-map 0:v:0',
        '-map 0:v:0',
        '-map 0:a:0',
        '-map 0:a:0',
        '-map 0:a:0',
        '-s:v:0 854x480',
        '-b:v:0 800k',
        '-maxrate:v:0 856k',
        '-bufsize:v:0 1200k',
        '-s:v:1 1280x720',
        '-b:v:1 2800k',
        '-maxrate:v:1 2996k',
        '-bufsize:v:1 4200k',
        '-s:v:2 1920x1080',
        '-b:v:2 5000k',
        '-maxrate:v:2 5350k',
        '-bufsize:v:2 7500k',
        '-b:a:0 96k',
        '-b:a:1 128k',
        '-b:a:2 192k',
        '-var_stream_map',
        'v:0,a:0 v:1,a:1 v:2,a:2',
        '-master_pl_name master.m3u8',
        '-hls_time 6',
        '-hls_list_size 0',
        '-hls_flags independent_segments',
        '-hls_segment_type mpegts',
        `-hls_segment_filename ${outputDir}/%v/segment%03d.ts`,
        '-f hls',
      ])
      .output(`${outputDir}/%v/index.m3u8`)
      .on('start', () => console.log('FFmpeg transcoding started'))
      .on('progress', (p) => onProgress(p.percent || 0))
      .on('end', () => {
        console.log('Transcoding complete');
        resolve({ masterPath, outputDir });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err.message);
        reject(err);
      });

    command.run();
  });
};

/**
 * Records where the HLS files live, as paths relative to the HLS root (for example
 * "ep-<id>/720p/index.m3u8"). These are NOT public URLs: playback links are created per request
 * by utils/hls.utils.js and are only handed out after an access check.
 * In production this is where an upload to a CDN / object storage would go.
 */
const uploadHLSToCloudinary = async (outputDir) => {
  const dir = path.basename(outputDir);
  const results = { '480p': null, '720p': null, '1080p': null, master: null };

  for (const quality of ['480p', '720p', '1080p']) {
    if (fs.existsSync(path.join(outputDir, quality, 'index.m3u8')))
      results[quality] = `${dir}/${quality}/index.m3u8`;
  }
  results.master = `${dir}/master.m3u8`;
  return results;
};

const cleanupTemp = (filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {}
};

module.exports = { transcodeToHLS, uploadHLSToCloudinary, cleanupTemp };
