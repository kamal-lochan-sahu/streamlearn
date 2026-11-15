const fs = require('fs');
const path = require('path');
const { hlsRoot, hlsDirName } = require('../utils/paths.utils');
const { collectVideoFiles, publishDir, removeDir } = require('./transcoding.service');

/**
 * Where finished video files live. This is the only file that knows about it.
 *
 *  STORAGE_DRIVER=local (default)  the server's own disk, HLS_OUTPUT_PATH. Free, fine for development.
 *                                  NOT durable on hosts with a temporary disk (Render free).
 *  STORAGE_DRIVER=s3               any S3-compatible bucket: Cloudflare R2, Backblaze B2, AWS S3, MinIO...
 *                                  S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
 *                                  S3_REGION (default "auto"), S3_SEGMENT_MODE (redirect|proxy),
 *                                  S3_PRESIGN_SECONDS (default 300).
 *
 * Layout in a bucket: <dir>/<version>/master.m3u8, <dir>/<version>/720p/index.m3u8, ...
 * Every transcode goes to a NEW version, the item points to it only when the upload is complete,
 * and older versions are deleted afterwards, so a failed re-upload never damages the video that plays.
 * Local disk keeps the old layout (<dir>/master.m3u8) and has no version.
 */

const isS3 = () => String(process.env.STORAGE_DRIVER || 'local').toLowerCase() === 's3';

const REQUIRED_S3 = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
const missingS3Settings = () => REQUIRED_S3.filter((name) => !process.env[name]);

const presignSeconds = () => Math.max(30, Number(process.env.S3_PRESIGN_SECONDS) || 300);
const segmentMode = () => (process.env.S3_SEGMENT_MODE === 'proxy' ? 'proxy' : 'redirect');

let cached = { id: '', client: null };
const s3 = () => {
  const missing = missingS3Settings();
  if (missing.length) throw new Error(`Object storage is not configured: ${missing.join(', ')}`);
  const id = [
    process.env.S3_ENDPOINT,
    process.env.S3_REGION,
    process.env.S3_ACCESS_KEY_ID,
    process.env.S3_SECRET_ACCESS_KEY,
  ].join('|');
  if (cached.client && cached.id === id) return cached.client;
  const { S3Client } = require('@aws-sdk/client-s3');
  cached = {
    id,
    client: new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'auto',
      forcePathStyle: true, // works with R2, B2, MinIO and AWS alike
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
      // newer SDKs add checksum headers by default that some S3-compatible services reject
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      maxAttempts: 4,
    }),
  };
  return cached.client;
};
const bucket = () => process.env.S3_BUCKET;

const CONTENT_TYPES = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.m4s': 'video/iso.segment',
  '.mp4': 'video/mp4',
  '.aac': 'audio/aac',
  '.vtt': 'text/vtt',
};

/** All files below a folder, as posix paths relative to it. */
const walk = (dir, base = '') =>
  fs.readdirSync(path.join(dir, base), { withFileTypes: true }).flatMap((entry) => {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(dir, rel) : [rel];
  });

/** Runs `task` for every item with at most `limit` running at the same time. */
const inParallel = async (items, limit, task) => {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await task(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
};

const deletePrefix = async (prefix, { keepPrefix } = {}) => {
  const { ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
  let token;
  let deleted = 0;
  do {
    const page = await s3().send(
      new ListObjectsV2Command({ Bucket: bucket(), Prefix: prefix, ContinuationToken: token })
    );
    const keys = (page.Contents || [])
      .map((o) => o.Key)
      .filter((k) => !keepPrefix || !k.startsWith(keepPrefix));
    if (keys.length) {
      await s3().send(
        new DeleteObjectsCommand({
          Bucket: bucket(),
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        })
      );
      deleted += keys.length;
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return deleted;
};

const uploadDir = async (localDir, prefix) => {
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const files = walk(localDir);
  await inParallel(files, 6, async (rel) => {
    await s3().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: `${prefix}/${rel}`,
        Body: fs.readFileSync(path.join(localDir, rel)),
        ContentType: CONTENT_TYPES[path.extname(rel).toLowerCase()] || 'application/octet-stream',
      })
    );
  });
  return files.length;
};

/**
 * Puts a finished transcode (in `workDir`) in its final place and removes `workDir`.
 * Returns what the item must store: { videoFiles, version }. version is null on local disk.
 * Nothing the item currently plays is touched here; call pruneOldVersions after the item was updated.
 */
const publishVideo = async ({ model, id, workDir, version }) => {
  const dirName = hlsDirName(model, id);
  if (!isS3()) {
    const videoFiles = collectVideoFiles(workDir, dirName);
    publishDir(workDir, path.join(hlsRoot(), dirName));
    return { videoFiles, version: null };
  }
  const tag = `v${version}`;
  const prefix = `${dirName}/${tag}`;
  const videoFiles = collectVideoFiles(workDir, prefix);
  try {
    await uploadDir(workDir, prefix);
  } catch (err) {
    await deletePrefix(`${prefix}/`).catch(() => {}); // half an upload is useless
    throw new Error(`Uploading the video to storage failed: ${err.message}`);
  }
  removeDir(workDir);
  return { videoFiles, version: tag };
};

/** Deletes every stored version of a video except `keepVersion`. Never throws. */
const pruneOldVersions = async (model, id, keepVersion) => {
  if (!isS3() || !keepVersion) return;
  const dirName = hlsDirName(model, id);
  try {
    await deletePrefix(`${dirName}/`, { keepPrefix: `${dirName}/${keepVersion}/` });
  } catch (err) {
    console.error(`Could not remove old versions of ${model} ${id}:`, err.message);
  }
};

/** Removes all stored files of one video (movie, episode or lecture). Never throws. */
const removeVideo = async (model, id) => {
  const dirName = hlsDirName(model, id);
  let ok = true;
  try {
    fs.rmSync(path.join(hlsRoot(), dirName), { recursive: true, force: true });
  } catch (err) {
    ok = false;
    console.error(`Could not remove video files of ${model} ${id}:`, err.message);
  }
  if (isS3() && !missingS3Settings().length) {
    try {
      await deletePrefix(`${dirName}/`);
    } catch (err) {
      ok = false;
      console.error(`Could not remove stored video of ${model} ${id}:`, err.message);
    }
  }
  return ok;
};

/** Reads a small stored file (a playlist). Returns a Buffer, or null when it does not exist. */
const readObject = async (key) => {
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  try {
    const out = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    return Buffer.from(await out.Body.transformToByteArray());
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
};

/** A short-lived direct download link, so video data does not pass through this server. */
const presignGet = async (key) => {
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: presignSeconds(),
  });
};

/** Streams a stored file into an HTTP response (S3_SEGMENT_MODE=proxy). Returns false when missing. */
const pipeObject = async (key, res) => {
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  try {
    const out = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    if (out.ContentType) res.set('Content-Type', out.ContentType);
    if (out.ContentLength !== undefined) res.set('Content-Length', String(out.ContentLength));
    await new Promise((resolve, reject) => {
      out.Body.on('error', reject).on('end', resolve).pipe(res);
    });
    return true;
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
};

module.exports = {
  isS3,
  missingS3Settings,
  segmentMode,
  presignSeconds,
  publishVideo,
  pruneOldVersions,
  removeVideo,
  readObject,
  presignGet,
  pipeObject,
};
