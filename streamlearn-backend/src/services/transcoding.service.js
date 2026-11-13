const fs = require('fs');
const path = require('path');
const { runFfmpeg } = require('../utils/ffmpeg.utils');

// Quality ladder. A rung is only made when the source is at least that tall,
// so a 720p upload never gets blown up to a (blurry, huge) 1080p copy.
const LADDER = [
  { name: '480p', height: 480, video: '800k', maxrate: '856k', bufsize: '1200k', audio: '96k' },
  { name: '720p', height: 720, video: '2800k', maxrate: '2996k', bufsize: '4200k', audio: '128k' },
  {
    name: '1080p',
    height: 1080,
    video: '5000k',
    maxrate: '5350k',
    bufsize: '7500k',
    audio: '192k',
  },
];

const evenDown = (n) => Math.max(2, Math.floor(n / 2) * 2);

/**
 * Which rungs to make for a source of this height (after rotation).
 * Always at least one: a source smaller than 480p gets a single rung at its own size.
 */
const pickRungs = (sourceHeight) => {
  const fitting = LADDER.filter((r) => r.height <= sourceHeight + 8); // 8px: 1088-high "1080p" files
  const chosen = fitting.length ? fitting : [LADDER[0]];
  return chosen.map((r) => ({ ...r, height: Math.min(r.height, evenDown(sourceHeight)) }));
};

/**
 * Transcodes a video into HLS: <outputDir>/master.m3u8 and <outputDir>/<rung>/index.m3u8 (+ segments).
 * @param {string} inputPath  uploaded file
 * @param {string} outputDir  directory for the result (it is wiped first)
 * @param {{probe: {height:number, duration:number, hasAudio:boolean}, onProgress?: (n:number)=>void}} opts
 * @returns {Promise<{rungs: string[], masterPath: string}>}
 */
const transcodeToHLS = async (inputPath, outputDir, { probe, onProgress = () => {} }) => {
  const rungs = pickRungs(probe.height);

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  rungs.forEach((r) => fs.mkdirSync(path.join(outputDir, r.name), { recursive: true }));

  const args = ['-i', inputPath];
  rungs.forEach(() => {
    args.push('-map', '0:v:0');
    if (probe.hasAudio) args.push('-map', '0:a:0');
  });

  args.push(
    '-c:v',
    'libx264',
    '-preset',
    process.env.FFMPEG_PRESET || 'fast',
    '-profile:v',
    'main',
    '-pix_fmt',
    'yuv420p',
    '-sc_threshold',
    '0',
    // a keyframe every 2s, whatever the frame rate, so every 6s segment starts on a keyframe
    '-force_key_frames',
    'expr:gte(t,n_forced*2)'
  );
  rungs.forEach((r, i) => {
    args.push(
      `-filter:v:${i}`,
      `scale=-2:${r.height}`, // keeps the aspect ratio, width stays an even number
      `-b:v:${i}`,
      r.video,
      `-maxrate:v:${i}`,
      r.maxrate,
      `-bufsize:v:${i}`,
      r.bufsize
    );
  });
  if (probe.hasAudio) {
    args.push('-c:a', 'aac', '-ac', '2');
    rungs.forEach((r, i) => args.push(`-b:a:${i}`, r.audio));
  }

  const streamMap = rungs
    .map((r, i) => (probe.hasAudio ? `v:${i},a:${i},name:${r.name}` : `v:${i},name:${r.name}`))
    .join(' ');

  args.push(
    '-f',
    'hls',
    '-hls_time',
    '6',
    '-hls_playlist_type',
    'vod',
    '-hls_flags',
    'independent_segments',
    '-hls_segment_type',
    'mpegts',
    '-master_pl_name',
    'master.m3u8',
    '-var_stream_map',
    streamMap,
    '-hls_segment_filename',
    path.join(outputDir, '%v', 'segment%03d.ts'),
    path.join(outputDir, '%v', 'index.m3u8')
  );

  await runFfmpeg(args, { durationSeconds: probe.duration, onProgress });

  const masterPath = path.join(outputDir, 'master.m3u8');
  if (!fs.existsSync(masterPath)) throw new Error('ffmpeg finished but made no playlist');
  return { rungs: rungs.map((r) => r.name), masterPath };
};

/**
 * What goes into `videoFiles`: paths relative to the HLS root (for example "ep-<id>/720p/index.m3u8").
 * These are NOT public URLs: playback links are created per request by utils/hls.utils.js
 * and only after an access check. Only rungs that really exist are listed.
 */
const collectVideoFiles = (outputDir) => {
  const dir = path.basename(outputDir);
  const files = { master: `${dir}/master.m3u8` };
  LADDER.forEach((r) => {
    if (fs.existsSync(path.join(outputDir, r.name, 'index.m3u8')))
      files[r.name] = `${dir}/${r.name}/index.m3u8`;
  });
  return files;
};

/**
 * Puts a finished transcode in place of the old one. The new files were made next to the old
 * ones, so a failed transcode never damages the video that is already playable.
 */
const publishDir = (newDir, finalDir) => {
  const backup = `${finalDir}.old-${Date.now()}`;
  const hadOld = fs.existsSync(finalDir);
  if (hadOld) fs.renameSync(finalDir, backup);
  try {
    fs.renameSync(newDir, finalDir);
  } catch (err) {
    if (hadOld) fs.renameSync(backup, finalDir);
    throw err;
  }
  if (hadOld) fs.rmSync(backup, { recursive: true, force: true });
};

const removeDir = (dir) => {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // best effort
  }
};

const cleanupTemp = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // already gone
  }
};

module.exports = {
  LADDER,
  pickRungs,
  transcodeToHLS,
  collectVideoFiles,
  publishDir,
  removeDir,
  cleanupTemp,
};
