import { LEAD_PRIORITIES, LEAD_STATUSES, PRIORITY_META, STATUS_META, type LeadPriority, type LeadStatus } from '@/lib/lead-meta';
import type { SelectOption } from './Select';

const dot = (cls: string) => <span className={`size-2.5 shrink-0 rounded-full ${cls}`} />;

export const statusOptions = (): SelectOption<LeadStatus>[] =>
  LEAD_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label, icon: dot(STATUS_META[s].dot) }));

export const priorityOptions = (): SelectOption<LeadPriority>[] =>
  LEAD_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_META[p].label, icon: dot(PRIORITY_META[p].dot) }));
