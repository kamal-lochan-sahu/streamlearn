const LivePoll = require('../models/LivePoll');

module.exports = (namespace) => {
  namespace.on('connection', (socket) => {
    socket.on('poll-vote', async ({ pollId, optionIndex }) => {
      if (!socket.user) return;
      const poll = await LivePoll.findById(pollId);
      if (!poll || !poll.isActive) return;
      const alreadyVoted = poll.options.some((o) => o.voters.includes(socket.user._id));
      if (alreadyVoted) return;

      await LivePoll.findByIdAndUpdate(pollId, {
        $inc: { [`options.${optionIndex}.votes`]: 1 },
        $push: { [`options.${optionIndex}.voters`]: socket.user._id },
      });
      const updated = await LivePoll.findById(pollId);
      namespace.to(poll.streamId.toString()).emit('poll-updated', updated);
    });

    socket.on('raise-hand', ({ streamId }) => {
      if (!socket.user) return;
      namespace
        .to(streamId)
        .emit('hand-raised', { userId: socket.user._id, name: socket.user.name });
    });
  });
};
