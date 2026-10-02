// Creates (or resets the password of) a platform admin for the /admin console.
// Usage: npm run create-admin -- admin@company.com "Full Name" [password]
// Without a password, a strong one is generated and printed once.
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const [email, name = 'Platform Admin', given] = process.argv.slice(2);
if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error('Usage: npm run create-admin -- admin@company.com "Full Name" [password]');
  process.exit(1);
}
if (given && given.length < 10) {
  console.error('Password must be at least 10 characters.');
  process.exit(1);
}
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set (.env.local)');
const password = given || crypto.randomBytes(12).toString('base64url');

await mongoose.connect(process.env.MONGODB_URI);
const admins = mongoose.connection.db.collection('platformadmins');
await admins.createIndex({ email: 1 }, { unique: true });
const now = new Date();
const existing = await admins.findOne({ email: email.toLowerCase() });
await admins.updateOne(
  { email: email.toLowerCase() },
  {
    $set: { name, passwordHash: await bcrypt.hash(password, 12), active: true, passwordChangedAt: now, updatedAt: now },
    $setOnInsert: { email: email.toLowerCase(), lastLoginAt: null, createdAt: now },
  },
  { upsert: true }
);
console.log(`${existing ? 'Updated' : 'Created'} platform admin ${email.toLowerCase()}`);
if (!given) console.log(`Password: ${password}   (shown once — change it in /admin/account)`);
console.log('Sign in at /admin/login');
await mongoose.disconnect();
