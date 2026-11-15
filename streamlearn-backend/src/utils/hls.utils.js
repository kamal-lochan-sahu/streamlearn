const jwt = require('jsonwebtoken');
const { verifyToken } = require('./jwt.utils');

const HLS_AUDIENCE = 'hls';
const HLS_DIR = /^(ep-|lec-)?[a-f0-9]{24}$/i;
const HLS_VERSION = /^v[a-z0-9-]{1,24}$/i;

/**
 * A stream token grants read access to ONE video directory for a few hours.
 * It sits inside the URL path, so the relative playlist and segment URLs inside an
 * HLS manifest inherit it automatically (a ?query token would be lost there).
 * The audience claim stops a normal login token from being used as a stream token.
 */
const signHlsToken = (dir, expiresIn = '4h', version) =>
  jwt.sign(version ? { d: dir, v: version } : { d: dir }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    audience: HLS_AUDIENCE,
    expiresIn,
  });

/**
 * Returns { dir, version } the token is valid for, or throws. `version` is only set for videos
 * that live in object storage (see services/storage.service.js); local videos have none.
 */
const verifyHlsTokenFull = (token) => {
  const payload = verifyToken(token, process.env.JWT_SECRET, { audience: HLS_AUDIENCE });
  if (typeof payload.d !== 'string' || !HLS_DIR.test(payload.d))
    throw new Error('Bad stream token');
  if (payload.v !== undefined && (typeof payload.v !== 'string' || !HLS_VERSION.test(payload.v)))
    throw new Error('Bad stream token');
  return { dir: payload.d, version: payload.v || null };
};

/** Returns the directory name the token is valid for, or throws. */
const verifyHlsToken = (token) => verifyHlsTokenFull(token).dir;

const publicBaseUrl = (req) =>
  (process.env.STREAM_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

const QUALITIES = ['480p', '720p', '1080p'];

/** Signed playback URL for a video directory. quality: 'master' or one of QUALITIES. */
const buildStreamUrl = (req, dir, quality = 'master', version) => {
  const file = QUALITIES.includes(quality) ? `${quality}/index.m3u8` : 'master.m3u8';
  return `${publicBaseUrl(req)}/hls/${signHlsToken(dir, '4h', version)}/${file}`;
};

module.exports = {
  signHlsToken,
  verifyHlsToken,
  verifyHlsTokenFull,
  buildStreamUrl,
  QUALITIES,
  HLS_DIR,
};
