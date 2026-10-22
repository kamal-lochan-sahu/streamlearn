const LiveChat = require('../models/LiveChat');
const LiveStream = require('../models/LiveStream');
const { checkLiveAccess, canManageStream } = require('../services/access.service');
const { isObjectId } = require('../utils/validate.utils');
const { fail, socketAuth, handler, createLimiter } = require('./socket.utils');

const CHAT_TYPES = ['text', 'question'];

module.exports = (namespace) => {
  namespace.use(socketAuth);

  const broadcastCount = async (streamId) =>
    namespace.to(streamId).emit('viewer-count-update', {
      count: (await namespace.in(streamId).fetchSockets()).length,
    });

  namespace.on('connection', (socket) => {
    socket.data.streams = new Set();
    const chatLimit = createLimiter(5, 5000);
    const reactLimit = createLimiter(10, 5000);

    socket.on(
      'join-stream',
      handler(socket, async ({ streamId }) => {
        if (!isObjectId(streamId)) fail('Invalid stream');
        const stream = await LiveStream.findById(streamId).select('ownerId audience batchId');
        if (!stream) fail('Stream not found');
        const access = await checkLiveAccess(socket.user, stream);
        if (!access.allowed) fail(access.message || 'Not allowed');

        if (!socket.data.streams.has(streamId)) {
          socket.data.streams.add(streamId);
          socket.join(streamId);
          await LiveStream.findByIdAndUpdate(streamId, { $inc: { totalViewers: 1 } });
        }
        await broadcastCount(streamId);
      })
    );

    socket.on(
      'leave-stream',
      handler(socket, async ({ streamId }) => {
        if (!socket.data.streams.delete(streamId)) return;
        socket.leave(streamId);
        await broadcastCount(streamId);
      })
    );

    socket.on(
      'send-message',
      handler(socket, async ({ streamId, message, type = 'text' }) => {
        if (!socket.data.streams.has(streamId)) fail('Join the stream first');
        if (typeof message !== 'string' || !message.trim()) return;
        if (message.length > 500) fail('Message is too long (max 500 characters)');
        if (!chatLimit()) fail('You are sending messages too fast');

        const stream = await LiveStream.findById(streamId).select('ownerId chatEnabled status');
        if (!stream || stream.status === 'ended') fail('Chat is closed');
        if (!stream.chatEnabled) fail('Chat is turned off for this stream');

        // Only the host/staff may post "answer" messages
        const staff = canManageStream(socket.user, stream);
        const kind = CHAT_TYPES.includes(type) || (type === 'answer' && staff) ? type : 'text';

        const chat = await LiveChat.create({
          streamId,
          userId: socket.user._id,
          message: message.trim(),
          type: kind,
        });
        await chat.populate('userId', 'name avatar');
        namespace.to(streamId).emit('new-message', chat);
      })
    );

    socket.on(
      'react',
      handler(socket, async ({ streamId, emoji }) => {
        if (!socket.data.streams.has(streamId)) fail('Join the stream first');
        if (typeof emoji !== 'string' || !emoji || emoji.length > 8) return;
        if (!reactLimit()) return;
        namespace.to(streamId).emit('reaction', { emoji, userId: socket.user._id });
      })
    );

    socket.on('disconnect', () => {
      for (const streamId of socket.data.streams) broadcastCount(streamId).catch(() => {});
    });
  });
};
