import 'server-only';
import mongoose from 'mongoose';
import type { AuthContext } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { notFound } from '@/lib/http';
import { Conversation } from '@/models/Conversation';

const MAX_STORED_MESSAGES = 200;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  tools: string[];
}
export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

// Conversations are private: always filtered by the signed-in user, never just by id.
const mine = (auth: AuthContext, id?: string) => {
  if (id !== undefined && !mongoose.isValidObjectId(id)) throw notFound('Chat not found.');
  return { orgId: auth.org.id, userId: auth.user.id, ...(id ? { _id: id } : {}) };
};

const titleFrom = (text: string) => {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > 60 ? `${line.slice(0, 57)}…` : line || 'New chat';
};

export async function listConversations(auth: AuthContext, limit = 50): Promise<ConversationSummary[]> {
  await connectDB();
  const rows = await Conversation.find(mine(auth), { title: 1, updatedAt: 1 }).sort({ updatedAt: -1 }).limit(limit).lean();
  return rows.map((c) => ({ id: String(c._id), title: c.title, updatedAt: (c.updatedAt as Date).toISOString() }));
}

export async function getConversation(auth: AuthContext, id: string) {
  await connectDB();
  const c = await Conversation.findOne(mine(auth, id)).lean();
  if (!c) throw notFound('Chat not found.');
  return {
    id: String(c._id),
    title: c.title,
    messages: c.messages.map((m): ChatMessage => ({ role: m.role as ChatMessage['role'], content: m.content, tools: m.tools })),
  };
}

// Saves one completed exchange (user message + assistant reply). Creates the chat on its first exchange.
export async function appendExchange(auth: AuthContext, id: string | null, user: string, assistant: { content: string; tools: string[] }) {
  await connectDB();
  const now = new Date();
  const messages = [
    { role: 'user', content: user, tools: [], at: now },
    { role: 'assistant', content: assistant.content, tools: assistant.tools, at: now },
  ];
  if (id) {
    const res = await Conversation.updateOne(mine(auth, id), { $push: { messages: { $each: messages, $slice: -MAX_STORED_MESSAGES } } });
    if (res.matchedCount) return id;
  }
  const created = await Conversation.create({ orgId: auth.org.id, userId: auth.user.id, title: titleFrom(user), messages });
  return String(created._id);
}

export async function deleteConversation(auth: AuthContext, id: string) {
  await connectDB();
  const res = await Conversation.deleteOne(mine(auth, id));
  if (!res.deletedCount) throw notFound('Chat not found.');
}
