const fs = require('fs');
const path = require('path');
const { hlsRoot, hlsDirName } = require('../utils/paths.utils');

/**
 * Where finished video files live. Today that is the server's own disk (free, `HLS_OUTPUT_PATH`).
 * Everything that touches stored video files outside the transcoder goes through this file, so a
 * later move to S3-compatible object storage (Cloudflare R2, Backblaze B2, ...) only has to
 * replace the functions below.
 */

/** Removes all stored files of one video (movie, episode or lecture). Never throws. */
const removeVideo = async (model, id) => {
  try {
    fs.rmSync(path.join(hlsRoot(), hlsDirName(model, id)), { recursive: true, force: true });
    return true;
  } catch (err) {
    console.error(`Could not remove video files of ${model} ${id}:`, err.message);
    return false;
  }
};

module.exports = { removeVideo };
