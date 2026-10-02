import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { defineModel } from '@/lib/db';

// Platform operator account. Deliberately separate from workspace users: it belongs to no
// workspace, signs in at /admin/login, and has its own session cookie.
const PlatformAdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    active: { type: Boolean, default: true },
    passwordChangedAt: { type: Date, default: null }, // admin sessions issued before this are rejected
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type PlatformAdminDoc = InferSchemaType<typeof PlatformAdminSchema> & { _id: mongoose.Types.ObjectId };

export const PlatformAdmin: Model<PlatformAdminDoc> = defineModel<PlatformAdminDoc>('PlatformAdmin', PlatformAdminSchema);
