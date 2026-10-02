import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { defineModel } from '@/lib/db';

// One payment for a plan period. `status: paid` is set exactly once, which makes activation idempotent
// across the browser callback and webhooks. `orderId` is the unique reference for the payment source:
// a Razorpay order (checkout), a payment link (plink_…), a subscription charge (sub_<paymentId>) or a
// manual record (manual_…) entered by a platform admin.
const PaymentSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    orderId: { type: String, required: true, unique: true },
    paymentId: { type: String, default: '' },
    plan: { type: String, required: true }, // Plan.key at the time of purchase
    period: { type: String, enum: ['monthly', 'yearly'], required: true },
    amount: { type: Number, required: true }, // paise
    status: { type: String, enum: ['created', 'paid'], default: 'created' },
    method: { type: String, enum: ['checkout', 'link', 'subscription', 'manual'], default: 'checkout' },
    subscriptionId: { type: String, default: '' },
    reference: { type: String, default: '' }, // payment-link URL, bank/UPI reference, …
    note: { type: String, default: '' },
    recordedBy: { type: String, default: '' }, // platform admin email for links / manual payments
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type PaymentDoc = InferSchemaType<typeof PaymentSchema> & { _id: mongoose.Types.ObjectId };

export const Payment: Model<PaymentDoc> = defineModel<PaymentDoc>('Payment', PaymentSchema);
