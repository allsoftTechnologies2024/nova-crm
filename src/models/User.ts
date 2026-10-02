import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { defineModel } from '@/lib/db';
import { ROLES } from '@/lib/rbac';

const UserSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'agent' },
    active: { type: Boolean, default: true },
    // Sessions issued before this are rejected (set on password change / reset).
    passwordChangedAt: { type: Date, default: null },
    // Password reset: only a SHA-256 hash of the emailed token is stored.
    resetTokenHash: { type: String, default: null, select: false },
    resetExpires: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

export const User: Model<UserDoc> = defineModel<UserDoc>('User', UserSchema);
