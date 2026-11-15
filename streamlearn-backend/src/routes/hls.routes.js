const router = require('express').Router();
const path = require('path');
const { verifyHlsTokenFull } = require('../utils/hls.utils');
const { hlsRoot } = require('../utils/paths.utils');
const storage = require('../services/storage.service');

const ALLOWED = new Set(['.m3u8', '.ts', '.m4s', '.mp4', '.aac', '.vtt']);
const notFound = (res) => res.status(404).json({ success: false, message: 'Not found' });

// GET /hls/:token/<file inside the video folder>
// No database lookup per segment: the token already says which video (and which stored copy) may be read.
//  - Videos on local disk (no version in the token): the file is sent from disk.
//  - Videos in object storage (version in the token): playlists are read from the bucket and sent from
//    here; every other file answers with a redirect to a short-lived direct link, so the video data does
//    not pass through this server (S3_SEGMENT_MODE=proxy streams it through instead).
router.get('/:token/*', async (req, res) => {
  let dir;
  let version;
  try {
    ({ dir, version } = verifyHlsTokenFull(req.params.token));
  } catch {
    return res.status(403).json({ success: false, message: 'Invalid or expired stream link' });
  }

  const rel = req.params[0] || '';
  const ext = path.extname(rel).toLowerCase();
  const clean = path.posix.normalize(rel);
  if (
    !ALLOWED.has(ext) ||
    rel.includes('\0') ||
    rel.includes('\\') ||
    clean.startsWith('..') ||
    clean.startsWith('/')
  )
    return notFound(res);

  if (version) {
    try {
      const key = `${dir}/${version}/${clean}`;
      if (ext === '.m3u8') {
        const body = await storage.readObject(key);
        if (!body) return notFound(res);
        res.set({
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'private, max-age=60',
        });
        return res.send(body);
      }
      if (storage.segmentMode() === 'proxy') {
        res.set('Cache-Control', 'private, max-age=300');
        if (!(await storage.pipeObject(key, res))) return notFound(res);
        return undefined;
      }
      // the redirect must not be cached longer than the link it points to stays valid
      res.set('Cache-Control', `private, max-age=${Math.floor(storage.presignSeconds() / 2)}`);
      return res.redirect(302, await storage.presignGet(key));
    } catch (err) {
      console.error('Stored video read failed:', err.message);
      if (!res.headersSent)
        return res.status(502).json({ success: false, message: 'Video storage is not reachable' });
      return undefined;
    }
  }

  const base = path.join(hlsRoot(), dir);
  const file = path.join(base, clean);
  if (!file.startsWith(base + path.sep)) return notFound(res);

  return res.sendFile(
    file,
    { dotfiles: 'deny', headers: { 'Cache-Control': 'private, max-age=300' } },
    (err) => {
      if (err && !res.headersSent)
        res.status(err.status === 404 || err.code === 'ENOENT' ? 404 : 500).json({
          success: false,
          message: 'Not found',
        });
    }
  );
});

module.exports = router;
