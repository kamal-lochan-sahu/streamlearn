import api from './api';

export const liveService = {
  getAll: (params) => api.get('/live', { params }),
  getOne: (id) => api.get(`/live/${id}`),
  getHLSUrl: (id) => api.get(`/live/${id}/stream-url`),
  // Admin
  create: (data) => api.post('/live/admin/create', data),
  update: (id, data) => api.put(`/live/admin/${id}`, data),
  start: (id) => api.post(`/live/admin/${id}/start`),
  end: (id) => api.post(`/live/admin/${id}/end`),
  createPoll: (id, data) => api.post(`/live/admin/${id}/poll`, data),
};
