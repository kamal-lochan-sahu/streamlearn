const { generateSignedUrl } = require('../utils/hls.utils');
const { ApiError } = require('../utils/ApiError');

const getStreamUrl = (content, quality = 'master') => {
  const videoFiles = content.videoFiles;
  if (!videoFiles) throw new ApiError(404, 'No video files found');

  const url = quality === 'master' ? videoFiles.master : videoFiles[quality];
  if (!url) throw new ApiError(404, `Quality ${quality} not available`);

  return generateSignedUrl(url);
};

const getAdaptiveUrl = (content) => {
  const url = content.videoFiles?.master;
  if (!url) throw new ApiError(404, 'No master playlist found');
  return generateSignedUrl(url);
};

module.exports = { getStreamUrl, getAdaptiveUrl };
