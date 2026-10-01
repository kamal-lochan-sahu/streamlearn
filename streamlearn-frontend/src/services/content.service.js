import api from './api'

export const contentService = {
  getAll:            (params) => api.get('/content', { params }),
  getFeatured:       ()       => api.get('/content/featured'),
  getTrending:       ()       => api.get('/content/trending'),
  getNewReleases:    ()       => api.get('/content/new-releases'),
  getContinueWatching: ()     => api.get('/content/continue-watching'),
  getRecommendations: ()      => api.get('/content/recommendations'),
  getBySlug:         (slug)   => api.get(`/content/${slug}`),
  getRelated:        (id)     => api.get(`/content/${id}/related`),
  getStreamUrl:      (slug)   => api.get(`/content/${slug}/stream`),
  search:            (data)   => api.post('/content/search', data),
  getEpisodes:       (slug)   => api.get(`/content/${slug}/episodes`),
  // Admin
  create:   (data)    => api.post('/content/admin/create', data),
  update:   (id, data)=> api.put(`/content/admin/${id}`, data),
  remove:   (id)      => api.delete(`/content/admin/${id}`),
  upload:   (id, form)=> api.post(`/content/admin/${id}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  toggle:   (id)      => api.put(`/content/admin/${id}/toggle`),
}
