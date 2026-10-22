const path = require('path');

// Where transcoded HLS files live on disk. They are NOT served as static files:
// the only way to read them is /hls/<signed token>/... (see routes/hls.routes.js).
const hlsRoot = () => path.resolve(process.env.HLS_OUTPUT_PATH || './uploads/hls');
const tempRoot = () => path.resolve(process.env.TEMP_UPLOAD_PATH || './uploads/temp');

const DIR_NAMES = {
  content: (id) => String(id),
  episode: (id) => `ep-${id}`,
  lecture: (id) => `lec-${id}`,
};

const hlsDirName = (model, id) => {
  const make = DIR_NAMES[model];
  if (!make) throw new Error(`Unknown video model: ${model}`);
  return make(id);
};

module.exports = { hlsRoot, tempRoot, hlsDirName };
