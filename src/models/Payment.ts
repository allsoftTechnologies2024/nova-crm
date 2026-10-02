import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { defineModel } from '@/lib/db';

// One Razorpay order. `status: paid` is set exactly once, which makes activation idempotent
// across the browser callback and the webhook.
const PaymentSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    orderId: { type: String, required: true, unique: true },
    paymentId: { type: String, default: '' },
    plan: { type: String, required: true }, // Plan.key at the time of purchase
    period: { type: String, enum: ['monthly', 'yearly'], required: true },
    amount: { type: Number, required: true }, // paise
    status: { type: String, enum: ['created', 'paid'], default: 'created' },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type PaymentDoc = InferSchemaType<typeof PaymentSchema> & { _id: mongoose.Types.ObjectId };

export const Payment: Model<PaymentDoc> = defineModel<PaymentDoc>('Payment', PaymentSchema);
