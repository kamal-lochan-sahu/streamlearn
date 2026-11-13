const { spawn } = require('child_process');
const { ApiError } = require('./ApiError');

// Read lazily so a value from .env (loaded after this file is required) is always used.
const ffmpegBin = () => process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobeBin = () => process.env.FFPROBE_PATH || 'ffprobe';

const maxVideoSeconds = () => (Number(process.env.MAX_VIDEO_HOURS) || 12) * 3600;
const transcodeTimeoutMs = () => (Number(process.env.TRANSCODE_TIMEOUT_MINUTES) || 360) * 60 * 1000;

const NOT_A_VIDEO = 'This file is not a readable video. Upload an MP4, MOV, MKV or WebM file.';

/** Turns raw ffprobe JSON into the few facts the rest of the app needs. Throws a 400 for non-videos. */
const summarizeProbe = (json) => {
  const streams = Array.isArray(json?.streams) ? json.streams : [];
  // A cover picture inside an audio file shows up as a "video" stream: skip those.
  const video = streams.find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic);
  const audio = streams.find((s) => s.codec_type === 'audio');
  if (!video) throw new ApiError(400, 'No video track found in this file.');

  let width = Number(video.width);
  let height = Number(video.height);
  if (!(width > 0 && height > 0)) throw new ApiError(400, NOT_A_VIDEO);

  // Phone videos are often stored sideways with a rotation flag; ffmpeg applies it while encoding.
  const sideData = (video.side_data_list || []).find((d) => d.rotation !== undefined);
  const rotation = Math.abs(Number(video.tags?.rotate ?? sideData?.rotation ?? 0)) % 360;
  if (rotation === 90 || rotation === 270) [width, height] = [height, width];

  const duration = Number(json.format?.duration) || Number(video.duration) || 0;
  if (!(duration > 0)) throw new ApiError(400, 'Could not read the length of this video.');
  const maxSeconds = maxVideoSeconds();
  if (duration > maxSeconds)
    throw new ApiError(400, `Video is longer than ${Math.round(maxSeconds / 3600)} hours.`);

  return {
    duration, // seconds, may have decimals
    width,
    height,
    hasAudio: Boolean(audio),
    videoCodec: video.codec_name || null,
    audioCodec: audio?.codec_name || null,
    bitrate: Number(json.format?.bit_rate) || null,
  };
};

/** ffprobe a file on disk. Rejects with ApiError(400) when it is not a usable video. */
const probeFile = (filePath) =>
  new Promise((resolve, reject) => {
    const args = [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];
    const child = spawn(ffprobeBin(), args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let finished = false;
    const done = (fn, value) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(() => child.kill('SIGKILL'), 30000);

    child.stdout.on('data', (d) => {
      out += d;
      if (out.length > 5e6) child.kill('SIGKILL'); // a normal probe is a few KB
    });
    child.stderr.on('data', () => {}); // drain
    child.on('error', (err) =>
      done(
        reject,
        err.code === 'ENOENT'
          ? new ApiError(500, 'ffprobe is not installed on the server (set FFPROBE_PATH).')
          : err
      )
    );
    child.on('close', (code) => {
      if (code !== 0) return done(reject, new ApiError(400, NOT_A_VIDEO));
      let json;
      try {
        json = JSON.parse(out);
      } catch {
        return done(reject, new ApiError(400, NOT_A_VIDEO));
      }
      try {
        done(resolve, summarizeProbe(json));
      } catch (err) {
        done(reject, err);
      }
    });
  });

/**
 * Runs ffmpeg with the given arguments (no shell, so file names can never be interpreted as commands).
 * onProgress receives 0..99 when durationSeconds is known.
 */
const runFfmpeg = (args, { durationSeconds = 0, onProgress } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      ffmpegBin(),
      [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-nostats',
        '-progress',
        'pipe:1',
        ...args,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let stderrTail = '';
    let buffer = '';
    let finished = false;
    const done = (fn, value) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      done(reject, new Error('Transcoding took too long and was stopped'));
    }, transcodeTimeoutMs());

    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith('out_time_us=') || !onProgress || !(durationSeconds > 0)) continue;
        const micro = Number(line.slice('out_time_us='.length));
        if (Number.isFinite(micro) && micro >= 0)
          onProgress(Math.min(99, (micro / 1e6 / durationSeconds) * 100));
      }
    });
    child.stderr.on('data', (d) => {
      stderrTail = (stderrTail + d).slice(-2000);
    });
    child.on('error', (err) =>
      done(
        reject,
        err.code === 'ENOENT'
          ? new Error('ffmpeg is not installed on the server (set FFMPEG_PATH)')
          : err
      )
    );
    child.on('close', (code) => {
      if (code === 0) return done(resolve);
      done(reject, new Error(`ffmpeg failed (exit ${code}): ${stderrTail.trim().slice(-500)}`));
    });
  });

module.exports = { probeFile, runFfmpeg, summarizeProbe };
