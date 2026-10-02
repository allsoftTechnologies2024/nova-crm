import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { defineModel } from '@/lib/db';

const OrganizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    plan: { type: String, default: 'free' }, // Plan.key (plans are managed from the platform console)
    planExpiresAt: { type: Date, default: null }, // end of trial / paid period; null = no end
    planSource: { type: String, enum: ['free', 'trial', 'paid', 'admin'], default: 'free' },
    trialUsed: { type: Boolean, default: false }, // one free trial per workspace
    // Razorpay subscription (Autopay). Each successful charge extends planExpiresAt by one period.
    autopay: {
      type: new mongoose.Schema(
        {
          subscriptionId: String,
          plan: String,
          period: { type: String, enum: ['monthly', 'yearly'] },
          status: String, // created | authenticated | active | pending | halted | cancelled | completed
          currentEnd: Date, // end of the current paid cycle (from Razorpay)
          cancelAtCycleEnd: Boolean,
        },
        { _id: false, timestamps: true }
      ),
      default: null,
    },
    // Which AI this workspace uses; see lib/ai/models.ts.
    ai: {
      provider: { type: String, enum: ['claude', 'gemini'], default: 'gemini' },
      model: { type: String, default: '' },
    },
    // Super-admin controls: suspend the workspace, or override plan limits (null = plan default, -1 = unlimited).
    suspended: { type: Boolean, default: false },
    // Platform override of which AI models this workspace may use. allowed unset = follow the platform list.
    aiPolicy: {
      allowed: { type: [String], default: undefined },
      locked: { type: Boolean, default: false }, // workspace can't change its model
    },
    limitOverrides: {
      seats: { type: Number, default: null },
      leads: { type: Number, default: null },
      aiCredits: { type: Number, default: null },
    },
    // AI credits used in the current calendar month ("YYYY-MM").
    aiUsage: {
      month: { type: String, default: '' },
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export type OrganizationDoc = InferSchemaType<typeof OrganizationSchema> & { _id: mongoose.Types.ObjectId };

export const Organization: Model<OrganizationDoc> = defineModel<OrganizationDoc>('Organization', OrganizationSchema);
