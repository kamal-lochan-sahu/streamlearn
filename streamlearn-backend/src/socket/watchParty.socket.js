const WatchParty = require('../models/WatchParty');
const { isObjectId } = require('../utils/validate.utils');
const { fail, socketAuth, handler, createLimiter } = require('./socket.utils');

module.exports = (namespace) => {
  namespace.use(socketAuth);

  namespace.on('connection', (socket) => {
    socket.data.parties = new Map(); // partyId -> { isHost }
    const chatLimit = createLimiter(5, 5000);
    const syncLimit = createLimiter(20, 5000);

    socket.on(
      'join-party',
      handler(socket, async ({ partyId }) => {
        if (!isObjectId(partyId)) fail('Invalid party');
        const party = await WatchParty.findById(partyId).select('hostId participants status');
        if (!party || party.status === 'ended') fail('Party not found or ended');

        // Only people who joined with the party code (REST /join) may enter the room
        const me = String(socket.user._id);
        const isMember = party.participants.some((p) => String(p) === me);
        if (!isMember) fail('Join the party with its code first');

        socket.data.parties.set(partyId, { isHost: String(party.hostId) === me });
        socket.join(partyId);
        const full = await WatchParty.findById(partyId).populate('participants', 'name avatar');
        namespace.to(partyId).emit('party-state', full);
      })
    );

    socket.on(
      'sync',
      handler(socket, async ({ partyId, timestamp, isPlaying }) => {
        const party = socket.data.parties.get(partyId);
        if (!party) fail('Join the party first');
        if (!party.isHost) return; // only the host controls playback
        if (!Number.isFinite(timestamp) || timestamp < 0 || typeof isPlaying !== 'boolean')
          fail('Invalid sync data');
        if (!syncLimit()) return;
        await WatchParty.findByIdAndUpdate(partyId, { currentTimestamp: timestamp, isPlaying });
        socket.to(partyId).emit('sync-update', { timestamp, isPlaying });
      })
    );

    socket.on(
      'chat',
      handler(socket, async ({ partyId, message }) => {
        if (!socket.data.parties.has(partyId)) fail('Join the party first');
        if (typeof message !== 'string' || !message.trim()) return;
        if (message.length > 500) fail('Message is too long (max 500 characters)');
        if (!chatLimit()) fail('You are sending messages too fast');

        const entry = { userId: socket.user._id, name: socket.user.name, message: message.trim() };
        const update = await WatchParty.findByIdAndUpdate(
          partyId,
          { $push: { chat: { $each: [entry], $slice: -200 } } },
          { new: true }
        );
        if (!update) fail('Party not found');
        namespace.to(partyId).emit('party-chat', update.chat.slice(-1)[0]);
      })
    );
  });
};
