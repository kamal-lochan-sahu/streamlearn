/**
 * Creates the first owner account (or promotes an existing account to owner).
 * Public sign-up never creates owners/admins, so this is the only way to get the first one.
 *
 *   npm run create-owner -- you@example.com "Your Name"
 *
 * The password is asked interactively (hidden), or taken from OWNER_PASSWORD.
 */
require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { normalizeEmail, requirePassword } = require('../src/utils/validate.utils');

const askHidden = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl._writeToOutput = (text) => {
      if (text.includes(question)) process.stdout.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });

(async () => {
  const [emailArg, nameArg] = process.argv.slice(2);
  if (!emailArg) {
    console.error('Usage: npm run create-owner -- <email> ["Full Name"]');
    process.exit(1);
  }
  const email = normalizeEmail(emailArg);

  await mongoose.connect(process.env.MONGODB_URI);
  const existing = await User.findOne({ email });

  if (existing) {
    existing.role = 'owner';
    existing.isVerified = true;
    await existing.save({ validateBeforeSave: false });
    console.log(`✅ ${email} is now an owner (existing account, password unchanged).`);
  } else {
    const password = requirePassword(
      process.env.OWNER_PASSWORD || (await askHidden('Password (min 8): '))
    );
    await User.create({
      name: nameArg || email.split('@')[0],
      email,
      password,
      role: 'owner',
      isVerified: true,
    });
    console.log(`✅ Owner created: ${email}`);
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
