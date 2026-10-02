const WatchParty = require('../models/WatchParty');

module.exports = (namespace) => {
  namespace.on('connection', (socket) => {
    socket.on('join-party', async ({ partyId }) => {
      socket.join(partyId);
      const party = await WatchParty.findById(partyId).populate('participants', 'name avatar');
      namespace.to(partyId).emit('party-state', party);
    });

    socket.on('sync', async ({ partyId, timestamp, isPlaying }) => {
      await WatchParty.findByIdAndUpdate(partyId, { currentTimestamp: timestamp, isPlaying });
      socket.to(partyId).emit('sync-update', { timestamp, isPlaying });
    });

    socket.on('chat', async ({ partyId, message }) => {
      if (!socket.user || !message?.trim()) return;
      const update = await WatchParty.findByIdAndUpdate(
        partyId,
        {
          $push: {
            chat: { userId: socket.user._id, name: socket.user.name, message: message.trim() },
          },
        },
        { new: true }
      );
      namespace.to(partyId).emit('party-chat', update.chat.slice(-1)[0]);
    });

    socket.on('disconnect', () => {});
  });
};
