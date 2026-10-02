import mongoose, { type InferSchemaType, type Model } from 'mongoose';
import { defineModel } from '@/lib/db';

// One Copilot chat. Private to the user who started it.
const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, default: '' },
  tools: { type: [String], default: [] }, // tool names the assistant used for this reply
  at: { type: Date, default: Date.now },
});

const ConversationSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New chat' },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true }
);

ConversationSchema.index({ orgId: 1, userId: 1, updatedAt: -1 });

export type ConversationDoc = InferSchemaType<typeof ConversationSchema> & { _id: mongoose.Types.ObjectId };

export const Conversation: Model<ConversationDoc> = defineModel<ConversationDoc>('Conversation', ConversationSchema);
