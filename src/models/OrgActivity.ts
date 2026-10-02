import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { defineModel } from '@/lib/db';

export const ACTIVITY_CATEGORIES = ['lead', 'note', 'ai', 'team', 'workspace', 'billing', 'auth'] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

// Workspace-wide audit trail: one row per thing a member (or the system) did.
const OrgActivitySchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = system (e.g. payment webhook)
    actorName: { type: String, default: 'System' },
    action: { type: String, required: true }, // e.g. "lead.stage_changed"
    category: { type: String, enum: ACTIVITY_CATEGORIES, required: true },
    summary: { type: String, required: true },
    entityType: { type: String, default: '' }, // "lead" | "user" | "workspace" | "payment"
    entityId: { type: String, default: '' },
    entityLabel: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OrgActivitySchema.index({ orgId: 1, createdAt: -1 });
OrgActivitySchema.index({ orgId: 1, actorId: 1, createdAt: -1 });

export type OrgActivityDoc = InferSchemaType<typeof OrgActivitySchema> & { _id: mongoose.Types.ObjectId; createdAt: Date };

export const OrgActivity: Model<OrgActivityDoc> = defineModel<OrgActivityDoc>('OrgActivity', OrgActivitySchema);
