import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { defineModel } from '@/lib/db';
import { LOCK_PLAN_KEY } from '@/lib/plans';

// Single document (key "global") with platform-wide billing rules, edited from the platform console.
const PlatformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    trial: {
      enabled: { type: Boolean, default: true },
      planKey: { type: String, default: 'pro' }, // plan new workspaces try for free
      days: { type: Number, default: 30, min: 1, max: 365 },
    },
    fallbackPlanKey: { type: String, default: LOCK_PLAN_KEY }, // used when there's no trial/subscription, or it ended; LOCK_PLAN_KEY = lock
    // AI models workspaces may use ("provider:model" keys) and the default for new / unset workspaces.
    ai: {
      enabledModels: { type: [String], default: undefined }, // unset = every model in the registry
      defaultModel: { type: String, default: '' },
    },
    catalogVersion: { type: Number, default: 0 }, // bumped on every plan/settings change so all servers reload
  },
  { timestamps: true }
);

export type PlatformSettingsDoc = InferSchemaType<typeof PlatformSettingsSchema> & { _id: mongoose.Types.ObjectId };

export const PlatformSettings: Model<PlatformSettingsDoc> = defineModel<PlatformSettingsDoc>('PlatformSettings', PlatformSettingsSchema);
