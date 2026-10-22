const LivePoll = require('../models/LivePoll');
const LiveStream = require('../models/LiveStream');
const { checkLiveAccess } = require('../services/access.service');
const { isObjectId } = require('../utils/validate.utils');
const { fail, socketAuth, handler, createLimiter } = require('./socket.utils');

module.exports = (namespace) => {
  namespace.use(socketAuth);

  namespace.on('connection', (socket) => {
    socket.data.streams = new Set();
    const handLimit = createLimiter(1, 10000);

    socket.on(
      'join-stream',
      handler(socket, async ({ streamId }) => {
        if (!isObjectId(streamId)) fail('Invalid stream');
        const stream = await LiveStream.findById(streamId).select('ownerId audience batchId');
        if (!stream) fail('Stream not found');
        const access = await checkLiveAccess(socket.user, stream);
        if (!access.allowed) fail(access.message || 'Not allowed');
        socket.data.streams.add(streamId);
        socket.join(streamId);
      })
    );

    socket.on(
      'poll-vote',
      handler(socket, async ({ pollId, optionIndex }) => {
        if (!isObjectId(pollId)) fail('Invalid poll');
        const poll = await LivePoll.findById(pollId);
        if (!poll || !poll.isActive) fail('Poll is closed');
        if (!socket.data.streams.has(String(poll.streamId))) fail('Join the stream first');
        if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length)
          fail('Invalid option');

        // One atomic update: it only matches while this user has not voted on ANY option
        // and the poll has not ended, so parallel votes cannot count twice.
        const voted = await LivePoll.findOneAndUpdate(
          {
            _id: pollId,
            isActive: true,
            $nor: [{ 'options.voters': socket.user._id }],
            $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }],
          },
          {
            $inc: { [`options.${optionIndex}.votes`]: 1 },
            $push: { [`options.${optionIndex}.voters`]: socket.user._id },
          },
          { new: true }
        );
        if (!voted) return; // already voted (or poll just ended)
        namespace.to(String(poll.streamId)).emit('poll-updated', voted);
      })
    );

    socket.on(
      'raise-hand',
      handler(socket, async ({ streamId }) => {
        if (!socket.data.streams.has(streamId)) fail('Join the stream first');
        if (!handLimit()) return;
        namespace
          .to(streamId)
          .emit('hand-raised', { userId: socket.user._id, name: socket.user.name });
      })
    );
  });
};
