/**
 * Keeps server-only transcode details (queue job id, failure reason) out of every JSON response.
 * It applies to both toJSON() (res.json(doc), JSON.stringify) and toObject() (used before spreading a
 * document into a response or the cache). Code on the server reads the fields directly from the document,
 * and the admin screens that need transcodeError add it to the response on purpose.
 */
const hideTranscodeInternals = (schema) => {
  const transform = (doc, ret) => {
    delete ret.transcodeJobId;
    delete ret.transcodeError;
    return ret;
  };
  schema.set('toJSON', { transform });
  schema.set('toObject', { transform });
};

module.exports = { hideTranscodeInternals };
