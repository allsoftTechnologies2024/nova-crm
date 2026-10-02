import 'server-only';
import mongoose from 'mongoose';
import { notFound } from '@/lib/http';

// Small helpers shared by the platform services.
export const month = () => new Date().toISOString().slice(0, 7);
export const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : null);
export const rx = (q: string) => new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
export const oid = (id: string, what = 'Record') => {
  if (!mongoose.isValidObjectId(id)) throw notFound(`${what} not found.`);
  return new mongoose.Types.ObjectId(id);
};
