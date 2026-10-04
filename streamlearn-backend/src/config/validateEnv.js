/**
 * Fails fast at startup when security-critical env vars are missing or weak.
 * Strict in production, only warns elsewhere.
 */
const validateEnv = () => {
  const problems = [];
  const need = (name) => {
    if (!process.env[name]) problems.push(`${name} is not set`);
  };

  ['MONGODB_URI', 'CLIENT_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'].forEach(need);

  const { JWT_SECRET, REFRESH_TOKEN_SECRET } = process.env;
  if (JWT_SECRET && JWT_SECRET.length < 32)
    problems.push('JWT_SECRET must be at least 32 characters');
  if (REFRESH_TOKEN_SECRET && REFRESH_TOKEN_SECRET.length < 32)
    problems.push('REFRESH_TOKEN_SECRET must be at least 32 characters');
  if (JWT_SECRET && JWT_SECRET === REFRESH_TOKEN_SECRET)
    problems.push('JWT_SECRET and REFRESH_TOKEN_SECRET must be different');

  if (!problems.length) return;
  const text = `Environment problems:\n - ${problems.join('\n - ')}`;
  if (process.env.NODE_ENV === 'production') throw new Error(text);
  console.warn(`⚠️  ${text}`);
};

module.exports = { validateEnv };
