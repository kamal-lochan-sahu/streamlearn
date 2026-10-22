const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { ApiError } = require('./ApiError');
const { tempRoot } = require('./paths.utils');

const safeName = (name) =>
  path
    .basename(String(name || 'file'))
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-100);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = tempRoot();
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) =>
    cb(
      null,
      `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName(file.originalname)}`
    ),
});

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const typeFilter = (rules) => (req, file, cb) => {
  const rule = rules[file.fieldname];
  if (typeof rule === 'function' && rule(file.mimetype)) return cb(null, true);
  cb(new ApiError(400, `Unsupported file for "${file.fieldname}"`));
};

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

const video = multer({
  storage,
  limits: { fileSize: 10 * GB },
  fileFilter: typeFilter({ video: (t) => t.startsWith('video/') }),
});
const image = multer({
  storage,
  limits: { fileSize: 10 * MB },
  fileFilter: typeFilter({ image: (t) => IMAGE_TYPES.includes(t) }),
});
const pdf = multer({
  storage,
  limits: { fileSize: 100 * MB },
  fileFilter: typeFilter({ pdf: (t) => t === 'application/pdf' }),
});
const lecture = multer({
  storage,
  limits: { fileSize: 10 * GB },
  fileFilter: typeFilter({
    video: (t) => t.startsWith('video/'),
    notes: (t) => t === 'application/pdf',
  }),
});

const removeFile = (filePath) => {
  try {
    if (filePath) fs.unlinkSync(filePath);
  } catch {
    // already gone
  }
};

module.exports = {
  videoUpload: video.single('video'),
  imageUpload: image.single('image'),
  pdfUpload: pdf.single('pdf'),
  lectureUpload: lecture.fields([
    { name: 'video', maxCount: 1 },
    { name: 'notes', maxCount: 1 },
  ]),
  removeFile,
};
