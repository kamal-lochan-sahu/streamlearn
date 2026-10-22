const router = require('express').Router();
const path = require('path');
const { verifyHlsToken } = require('../utils/hls.utils');
const { hlsRoot } = require('../utils/paths.utils');

const ALLOWED = new Set(['.m3u8', '.ts', '.m4s', '.mp4', '.aac', '.vtt']);

// GET /hls/:token/<file inside the video folder>
// No database lookup per segment: the token already says which folder may be read.
router.get('/:token/*', (req, res) => {
  let dir;
  try {
    dir = verifyHlsToken(req.params.token);
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
    return res.status(404).json({ success: false, message: 'Not found' });

  const base = path.join(hlsRoot(), dir);
  const file = path.join(base, clean);
  if (!file.startsWith(base + path.sep))
    return res.status(404).json({ success: false, message: 'Not found' });

  res.sendFile(
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
