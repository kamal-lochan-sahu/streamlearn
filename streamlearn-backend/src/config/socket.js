const { Server } = require('socket.io');
const liveChatSocket = require('../socket/liveChat.socket');
const watchPartySocket = require('../socket/watchParty.socket');
const liveStreamSocket = require('../socket/liveStream.socket');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
    pingTimeout: 60000,
  });

  // Authentication is done per namespace (io.use() would only cover the main "/" namespace),
  // see socket/socket.utils.js. Connections without a valid access token are rejected.

  // Namespaces
  liveChatSocket(io.of('/live-chat'));
  watchPartySocket(io.of('/watch-party'));
  liveStreamSocket(io.of('/live-stream'));

  console.log('✅ Socket.io initialized');
  return io;
};

const getIO = () => io;
module.exports = { initSocket, getIO };
