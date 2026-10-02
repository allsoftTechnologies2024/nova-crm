import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { defineModel } from '@/lib/db';
import { ACTIVITY_TYPES, LEAD_PRIORITIES, LEAD_STATUSES } from '@/lib/lead-meta';

// One entry in a lead's timeline: notes, calls, status changes, AI updates.
const ActivitySchema = new mongoose.Schema({
  type: { type: String, enum: ACTIVITY_TYPES, default: 'note' },
  text: { type: String, default: '' },
  by: { type: String, default: '' }, // display name at the time
  at: { type: Date, default: Date.now },
});

const LeadSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, trim: true, default: '' },
    company: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    source: { type: String, trim: true, default: '' },
    need: { type: String, default: '' },
    value: { type: Number, default: 0 }, // expected deal value, INR
    status: { type: String, enum: LEAD_STATUSES, default: 'new' },
    priority: { type: String, enum: LEAD_PRIORITIES, default: 'warm' },
    tags: { type: [String], default: [] },
    nextFollowUp: { type: Date, default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ai: {
      type: new mongoose.Schema({ score: Number, summary: String, nextAction: String, at: Date }, { _id: false }),
      default: null,
    },
    activities: { type: [ActivitySchema], default: [] },
  },
  { timestamps: true }
);

LeadSchema.index({ orgId: 1, status: 1, updatedAt: -1 });
LeadSchema.index({ orgId: 1, assignedTo: 1 });
LeadSchema.index({ orgId: 1, nextFollowUp: 1 });

export type LeadDoc = InferSchemaType<typeof LeadSchema> & { _id: mongoose.Types.ObjectId };

export const Lead: Model<LeadDoc> = defineModel<LeadDoc>('Lead', LeadSchema);
