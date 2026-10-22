const { verifyToken } = require('../utils/jwt.utils');
const User = require('../models/User');

/** An error whose message is safe to show to the client. */
class SocketError extends Error {}

const fail = (message) => {
  throw new SocketError(message);
};

/**
 * Namespace middleware (io.use() only covers the main "/" namespace, so this must be applied to
 * every namespace). Rejects the connection unless the access token is valid, then loads the user
 * so handlers can check role / subscription without trusting anything the client sends.
 */
const socketAuth = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token || typeof token !== 'string') return next(new Error('Unauthorized'));
    const decoded = verifyToken(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id)
      .select('name avatar role isActive subscription')
      .lean();
    if (!user || !user.isActive) return next(new Error('Unauthorized'));
    socket.user = user;
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
};

/**
 * Wraps an event handler so that bad input or a database error can never crash the server
 * (an unhandled rejection inside an event listener would). The payload is always an object.
 */
const handler = (socket, fn) => async (payload) => {
  try {
    await fn(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {});
  } catch (err) {
    if (err instanceof SocketError) socket.emit('socket-error', { message: err.message });
    else {
      console.error('Socket handler error:', err.message);
      socket.emit('socket-error', { message: 'Something went wrong' });
    }
  }
};

/** Sliding-window limiter, one per socket: returns true when the action is allowed. */
const createLimiter = (max, windowMs) => {
  let hits = [];
  return () => {
    const now = Date.now();
    hits = hits.filter((t) => now - t < windowMs);
    if (hits.length >= max) return false;
    hits.push(now);
    return true;
  };
};

module.exports = { SocketError, fail, socketAuth, handler, createLimiter };
