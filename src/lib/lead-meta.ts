// Lead vocabulary shared by server and client (no server imports here).

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_PRIORITIES = ['hot', 'warm', 'cold'] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const ACTIVITY_TYPES = ['created', 'note', 'call', 'email', 'status', 'ai', 'assign'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const STATUS_META: Record<LeadStatus, { label: string; tone: string; dot: string }> = {
  new: { label: 'New', tone: 'bg-sky-500/10 text-sky-600 ring-sky-500/20', dot: 'bg-sky-400' },
  contacted: { label: 'Contacted', tone: 'bg-teal-500/10 text-teal-700 ring-teal-500/20', dot: 'bg-teal-400' },
  qualified: { label: 'Qualified', tone: 'bg-orange-500/10 text-orange-700 ring-orange-500/20', dot: 'bg-orange-400' },
  proposal: { label: 'Proposal', tone: 'bg-red-500/10 text-red-700 ring-red-500/20', dot: 'bg-red-500' },
  negotiation: { label: 'Negotiation', tone: 'bg-amber-500/10 text-amber-600 ring-amber-500/20', dot: 'bg-amber-400' },
  won: { label: 'Won', tone: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20', dot: 'bg-emerald-400' },
  lost: { label: 'Lost', tone: 'bg-zinc-500/10 text-zinc-500 ring-zinc-500/20', dot: 'bg-zinc-500' },
};

export const PRIORITY_META: Record<LeadPriority, { label: string; dot: string }> = {
  hot: { label: 'Hot', dot: 'bg-rose-500' },
  warm: { label: 'Warm', dot: 'bg-amber-400' },
  cold: { label: 'Cold', dot: 'bg-sky-400' },
};

export const STATUS_GUIDE =
  'new (not contacted yet), contacted (spoke / messaged, interest unclear), qualified (real need + budget/authority confirmed), proposal (quote or proposal sent), negotiation (discussing price/terms), won (agreed / paid), lost (not interested / unreachable).';

export const CLOSED_STATUSES: LeadStatus[] = ['won', 'lost'];

// Plain, serialisable lead shape sent to client components and the AI.
export interface LeadDTO {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  need: string;
  value: number;
  status: LeadStatus;
  priority: LeadPriority;
  tags: string[];
  nextFollowUp: string | null;
  assignedTo: { id: string; name: string } | null;
  ai: { score: number; summary: string; nextAction: string; at: string } | null;
  activities: { id: string; type: ActivityType; text: string; by: string; at: string }[];
  createdAt: string;
  updatedAt: string;
}

export const leadTitle = (l: Pick<LeadDTO, 'name' | 'company' | 'email' | 'phone'>) =>
  l.company || l.name || l.email || l.phone || 'Unnamed lead';
