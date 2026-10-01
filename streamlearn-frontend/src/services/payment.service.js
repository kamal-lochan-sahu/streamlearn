import api from './api'

export const paymentService = {
  getPlans:             ()         => api.get('/plans'),
  createRazorpayOrder:  (data)     => api.post('/payments/razorpay/create-order', data),
  verifyRazorpay:       (data)     => api.post('/payments/razorpay/verify', data),
  createStripeIntent:   (data)     => api.post('/payments/stripe/create-intent', data),
  validateCoupon:       (data)     => api.post('/coupons/validate', data),
  getHistory:           ()         => api.get('/payments/history'),
  buyPPV:               (contentId)=> api.post(`/payments/ppv/${contentId}`),
  cancelSubscription:   ()         => api.put('/subscriptions/cancel'),
  pauseSubscription:    ()         => api.put('/subscriptions/pause'),
}
