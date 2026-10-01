const LiveChat   = require('../models/LiveChat');
const LiveStream = require('../models/LiveStream');

module.exports = (namespace) => {
  namespace.on('connection', (socket) => {
    console.log(`LiveChat: ${socket.id} connected`);

    socket.on('join-stream', async ({ streamId }) => {
      socket.join(streamId);
      // Update viewer count
      await LiveStream.findByIdAndUpdate(streamId, { $inc: { totalViewers: 1 } });
      namespace.to(streamId).emit('viewer-count-update', {
        count: (await namespace.in(streamId).fetchSockets()).length
      });
    });

    socket.on('leave-stream', async ({ streamId }) => {
      socket.leave(streamId);
    });

    socket.on('send-message', async ({ streamId, message, type = 'text' }) => {
      if (!socket.user || !message?.trim()) return;
      const chat = await LiveChat.create({
        streamId, userId: socket.user._id, message: message.trim(), type
      });
      await chat.populate('userId', 'name avatar');
      namespace.to(streamId).emit('new-message', chat);
    });

    socket.on('react', ({ streamId, emoji }) => {
      namespace.to(streamId).emit('reaction', { emoji, userId: socket.user?._id });
    });

    socket.on('disconnect', () => {
      console.log(`LiveChat: ${socket.id} disconnected`);
    });
  });
};
