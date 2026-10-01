const Content = require('../models/Content');

/**
 * Simple collaborative filtering — recommend based on genre/watch history
 * TODO: upgrade to ML model
 */
const getRecommendations = async (user, limit = 20) => {
  const activeProfile = user.profiles?.[user.activeProfile];
  const preferredGenres = activeProfile?.preferences?.genres || [];

  const query = { isActive: true, access: { $in: ['free', 'subscribers'] } };
  if (preferredGenres.length) query.genre = { $in: preferredGenres };

  const content = await Content.find(query)
    .sort({ 'rating.average': -1, viewCount: -1 })
    .limit(limit)
    .select('title thumbnail slug type duration rating viewCount');

  return content;
};

module.exports = { getRecommendations };
