import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { defineModel } from '@/lib/db';

// Audit trail of every super-admin action (plan overrides, suspensions, impersonation, …).
const AdminLogSchema = new mongoose.Schema(
  {
    actorEmail: { type: String, required: true },
    action: { type: String, required: true },
    targetType: { type: String, enum: ['org', 'user', 'platform'], required: true },
    targetId: { type: String, default: '' },
    summary: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
AdminLogSchema.index({ createdAt: -1 });

export type AdminLogDoc = InferSchemaType<typeof AdminLogSchema> & { _id: mongoose.Types.ObjectId };

export const AdminLog: Model<AdminLogDoc> = defineModel<AdminLogDoc>('AdminLog', AdminLogSchema);
