import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { defineModel } from '@/lib/db';

// A subscription plan. Managed from the platform console; read by workspaces for limits and billing.
// Limits use -1 for "unlimited". Prices are in paise.
const PlanSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true }, // permanent id, e.g. "pro"
    name: { type: String, required: true, trim: true },
    tagline: { type: String, default: '' },
    priceMonthly: { type: Number, default: 0, min: 0 },
    priceYearly: { type: Number, default: 0, min: 0 },
    limits: {
      seats: { type: Number, default: 2 },
      leads: { type: Number, default: 100 },
      aiCredits: { type: Number, default: 50 },
    },
    features: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    public: { type: Boolean, default: true },
    popular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    // Razorpay plan ids for Autopay, created on demand: { monthly: { id, amount, keyId }, yearly: { … } }.
    // A new Razorpay plan is created whenever the price or the API key (test → live) changes.
    razorpayPlans: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export type PlanDoc = InferSchemaType<typeof PlanSchema> & { _id: mongoose.Types.ObjectId };

export const PlanModel: Model<PlanDoc> = defineModel<PlanDoc>('Plan', PlanSchema);
