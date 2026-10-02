import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { defineModel } from '@/lib/db';

// A saved AI team summary, so it can be re-read without spending another AI credit.
const TeamReportSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    period: { type: String, enum: ['day', 'week', 'month'], required: true },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    createdBy: { type: String, default: '' },
    provider: { type: String, default: '' },
    report: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
TeamReportSchema.index({ orgId: 1, period: 1, createdAt: -1 });

export type TeamReportDoc = InferSchemaType<typeof TeamReportSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date };

export const TeamReport: Model<TeamReportDoc> = defineModel<TeamReportDoc>('TeamReport', TeamReportSchema);
