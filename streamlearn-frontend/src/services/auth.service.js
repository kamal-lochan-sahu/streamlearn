import api from './api'

export const authService = {
  register:       (data) => api.post('/auth/register', data),
  login:          (data) => api.post('/auth/login', data),
  logout:         ()     => api.post('/auth/logout'),
  sendOTP:        (data) => api.post('/auth/send-otp', data),
  verifyOTP:      (data) => api.post('/auth/verify-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword:  (token, data) => api.post(`/auth/reset-password/${token}`, data),
  changePassword: (data) => api.post('/auth/change-password', data),
  refreshToken:   ()     => api.post('/auth/refresh-token'),
}
