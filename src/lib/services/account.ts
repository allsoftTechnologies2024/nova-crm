import 'server-only';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { AuthContext } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { badRequest, HttpError } from '@/lib/http';
import { sendMail } from '@/lib/mailer';
import { User } from '@/models/User';
import { actorOf, logActivity } from './activity';

const RESET_TTL_MIN = 30;
const RESEND_COOLDOWN_MS = 60_000;

export const password = z.string().min(8, 'Use at least 8 characters').max(100);
export const profileSchema = z.object({ name: z.string().trim().min(1).max(80) });
export const passwordChangeSchema = z.object({ current: z.string().min(1), next: password });
export const forgotSchema = z.object({ email: z.email() });
export const resetSchema = z.object({ token: z.string().min(20).max(200), password });

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function updateProfile(auth: AuthContext, input: z.infer<typeof profileSchema>) {
  await connectDB();
  await User.updateOne({ _id: auth.user.id }, { $set: { name: input.name } });
  if (input.name !== auth.user.name) await logActivity({ ...actorOf(auth), name: input.name }, { action: 'auth.profile', category: 'auth', summary: `Changed their name from ${auth.user.name} to ${input.name}` });
}

// Verifies the current password, sets the new one, and signs out every other session.
export async function changePassword(auth: AuthContext, input: z.infer<typeof passwordChangeSchema>) {
  await connectDB();
  const user = await User.findById(auth.user.id).select('+passwordHash');
  if (user && !user.passwordHash) throw badRequest('You sign in with Google and have no password yet. Use "Forgot password" on the sign-in page to set one.');
  if (!user?.passwordHash || !(await bcrypt.compare(input.current, user.passwordHash))) throw badRequest('Your current password is incorrect.');
  if (input.current === input.next) throw badRequest('Choose a password different from your current one.');
  user.passwordHash = await bcrypt.hash(input.next, 10);
  user.passwordChangedAt = new Date();
  await user.save();
  await logActivity(actorOf(auth), { action: 'auth.password_changed', category: 'auth', summary: 'Changed their password (other devices signed out)' });
  return { userId: String(user._id), orgId: String(user.orgId) };
}

// Emails a single-use reset link. Always succeeds from the caller's point of view so it can't reveal
// which emails have accounts.
export async function requestPasswordReset(email: string, appUrl: string) {
  await connectDB();
  const user = await User.findOne({ email: email.toLowerCase(), active: true }).select('+resetExpires');
  if (!user) return;
  // Throttle: one email per minute per account.
  const issuedAt = user.resetExpires ? user.resetExpires.getTime() - RESET_TTL_MIN * 60_000 : 0;
  if (Date.now() - issuedAt < RESEND_COOLDOWN_MS) return;

  const token = crypto.randomBytes(32).toString('base64url');
  user.resetTokenHash = sha256(token);
  user.resetExpires = new Date(Date.now() + RESET_TTL_MIN * 60_000);
  await user.save();

  const link = `${appUrl}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your Smart CRM password',
    text: `Hi ${user.name},\n\nReset your password using this link (valid for ${RESET_TTL_MIN} minutes):\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#151515">
  <h2 style="margin:0 0 12px">Reset your password</h2>
  <p>Hi ${user.name.replace(/[<>&]/g, '')}, click the button below to choose a new password. The link is valid for ${RESET_TTL_MIN} minutes.</p>
  <p style="margin:24px 0"><a href="${link}" style="background:#151515;color:#fff;padding:12px 20px;border-radius:14px;text-decoration:none;font-weight:600">Reset password</a></p>
  <p style="color:#8a8580;font-size:13px">If you didn't ask for this, you can ignore this email.</p>
</div>`,
  });
}

// Consumes a reset token: sets the new password and invalidates the token and all existing sessions.
export async function resetPassword(input: z.infer<typeof resetSchema>) {
  await connectDB();
  const user = await User.findOneAndUpdate(
    { resetTokenHash: sha256(input.token), resetExpires: { $gt: new Date() }, active: true },
    { $set: { passwordHash: await bcrypt.hash(input.password, 10), passwordChangedAt: new Date(), resetTokenHash: null, resetExpires: null } },
    { new: true }
  );
  if (!user) throw new HttpError(400, 'This reset link is invalid or has expired. Request a new one.');
  await logActivity({ orgId: String(user.orgId), userId: String(user._id), name: user.name }, { action: 'auth.password_reset', category: 'auth', summary: 'Reset their password with an emailed link' });
  return { userId: String(user._id), orgId: String(user.orgId) };
}
