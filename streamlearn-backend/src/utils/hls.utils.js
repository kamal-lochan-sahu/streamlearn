const jwt = require('jsonwebtoken');
const { verifyToken } = require('./jwt.utils');

const HLS_AUDIENCE = 'hls';
const HLS_DIR = /^(ep-|lec-)?[a-f0-9]{24}$/i;

/**
 * A stream token grants read access to ONE video directory for a few hours.
 * It sits inside the URL path, so the relative playlist and segment URLs inside an
 * HLS manifest inherit it automatically (a ?query token would be lost there).
 * The audience claim stops a normal login token from being used as a stream token.
 */
const signHlsToken = (dir, expiresIn = '4h') =>
  jwt.sign({ d: dir }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    audience: HLS_AUDIENCE,
    expiresIn,
  });

/** Returns the directory name the token is valid for, or throws. */
const verifyHlsToken = (token) => {
  const payload = verifyToken(token, process.env.JWT_SECRET, { audience: HLS_AUDIENCE });
  if (typeof payload.d !== 'string' || !HLS_DIR.test(payload.d))
    throw new Error('Bad stream token');
  return payload.d;
};

const publicBaseUrl = (req) =>
  (process.env.STREAM_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

const QUALITIES = ['480p', '720p', '1080p'];

/** Signed playback URL for a video directory. quality: 'master' or one of QUALITIES. */
const buildStreamUrl = (req, dir, quality = 'master') => {
  const file = QUALITIES.includes(quality) ? `${quality}/index.m3u8` : 'master.m3u8';
  return `${publicBaseUrl(req)}/hls/${signHlsToken(dir)}/${file}`;
};

module.exports = { signHlsToken, verifyHlsToken, buildStreamUrl, QUALITIES, HLS_DIR };
