#!/usr/bin/env node
/**
 * Tests your object storage settings (Cloudflare R2 or Backblaze B2) end to end:
 * upload, list, presigned download, CORS header, delete.
 *
 * Usage (from the streamlearn-backend folder):
 *   S3_ENDPOINT=... S3_BUCKET=... S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... S3_REGION=auto \
 *     node ../scripts/storage-check.js
 * or put the S3_* lines in streamlearn-backend/.env and just run it.
 */
const path = require('path');
const backend = path.join(__dirname, '..', 'streamlearn-backend');
const req = require('module').createRequire(path.join(backend, 'package.json'));
req('dotenv').config({ path: path.join(backend, '.env') });
process.env.STORAGE_DRIVER = 's3';

const storage = require(path.join(backend, 'src', 'services', 'storage.service'));

const missing = storage.missingS3Settings();
if (missing.length) {
  console.error(`Missing settings: ${missing.join(', ')}`);
  process.exit(2);
}

let bad = 0;
const step = (name, good, detail = '') => {
  if (!good) bad++;
  console.log(`${good ? '✔' : '✘'} ${name}${!good && detail ? `\n    ${detail}` : ''}`);
};

(async () => {
  const prefix = `storage-check-${Date.now()}`;
  const key = `${prefix}/v1/test.ts`;
  const body = Buffer.alloc(200000, 7);
  const { S3Client, PutObjectCommand } = req('@aws-sdk/client-s3');
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'auto',
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: `${prefix}/v1/test.m3u8`,
        Body: '#EXTM3U\n',
        ContentType: 'application/vnd.apple.mpegurl',
      })
    );
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: 'video/mp2t',
      })
    );
    step('upload works (keys, bucket and endpoint are right)', true);
  } catch (e) {
    step('upload works (keys, bucket and endpoint are right)', false, `${e.name}: ${e.message}`);
    process.exit(1);
  }
  try {
    const text = await storage.readObject(`${prefix}/v1/test.m3u8`);
    step('server can read a playlist back', text && text.toString().startsWith('#EXTM3U'));
    const url = await storage.presignGet(key);
    const res = await fetch(url, { headers: { Origin: 'https://example.vercel.app' } });
    const len = (await res.arrayBuffer()).byteLength;
    step(
      'presigned link downloads the file',
      res.status === 200 && len === body.length,
      `status ${res.status}, ${len} bytes`
    );
    const cors = res.headers.get('access-control-allow-origin');
    step(
      'CORS allows browsers (needed by the video player)',
      !!cors,
      'No Access-Control-Allow-Origin header. Add a CORS rule on the bucket: allowed origin *, methods GET and HEAD.'
    );
  } catch (e) {
    step('read and presigned download', false, `${e.name}: ${e.message}`);
  }
  try {
    const { ListObjectsV2Command, DeleteObjectsCommand } = req('@aws-sdk/client-s3');
    const list = await client.send(
      new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET, Prefix: `${prefix}/` })
    );
    const objs = (list.Contents || []).map((o) => ({ Key: o.Key }));
    if (objs.length)
      await client.send(
        new DeleteObjectsCommand({ Bucket: process.env.S3_BUCKET, Delete: { Objects: objs } })
      );
    const after = await client.send(
      new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET, Prefix: `${prefix}/` })
    );
    step('delete works and the test files are gone', !(after.Contents || []).length);
  } catch (e) {
    step('delete works', false, `${e.name}: ${e.message}`);
  }
  console.log(
    bad
      ? `\n❌ ${bad} problem(s). Fix them before deploying.`
      : '\n✅ Storage is ready for StreamLearn.'
  );
  process.exit(bad ? 1 : 0);
})();
