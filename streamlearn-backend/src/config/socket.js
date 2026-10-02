const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt.utils');
const liveChatSocket = require('../socket/liveChat.socket');
const watchPartySocket = require('../socket/watchParty.socket');
const liveStreamSocket = require('../socket/liveStream.socket');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
    pingTimeout: 60000,
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (token) {
        const decoded = verifyToken(token, process.env.JWT_SECRET);
        socket.user = decoded;
      }
    } catch {}
    next();
  });

  // Namespaces
  liveChatSocket(io.of('/live-chat'));
  watchPartySocket(io.of('/watch-party'));
  liveStreamSocket(io.of('/live-stream'));

  console.log('✅ Socket.io initialized');
  return io;
};

const getIO = () => io;
module.exports = { initSocket, getIO };
