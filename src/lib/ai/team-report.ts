import 'server-only';
import mongoose from 'mongoose';
import { z } from 'zod';
import type { AuthContext } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { forbidden } from '@/lib/http';
import { ROLE_META } from '@/lib/rbac';
import { actorOf, logActivity, memberStats, recentLinesFor } from '@/lib/services/activity';
import { TeamReport } from '@/models/TeamReport';
import { withAi } from './index';
import type { JsonSchema } from './types';

export const PERIODS = { day: { days: 1, label: 'Last 24 hours' }, week: { days: 7, label: 'Last 7 days' }, month: { days: 30, label: 'Last 30 days' } } as const;
export type Period = keyof typeof PERIODS;
export const periodSchema = z.object({ period: z.enum(['day', 'week', 'month']), now: z.string().max(100) });

export const RATINGS = ['standout', 'steady', 'needs_attention', 'inactive'] as const;
export interface TeamReportData {
  headline: string;
  overview: string;
  members: { memberId: string; name: string; rating: (typeof RATINGS)[number]; summary: string; highlights: string[]; concerns: string[]; suggestion: string }[];
  recommendations: string[];
}

const str = (description: string) => ({ type: 'string', description });
const strs = (description: string) => ({ type: 'array', items: { type: 'string' }, description });
const SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    headline: str('One punchy sentence on how the team did this period'),
    overview: str('3-4 sentences: overall momentum, pipeline movement, wins, and where the team is stuck'),
    members: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          memberId: str('The member id exactly as given'),
          name: str('Member name'),
          rating: { type: 'string', enum: [...RATINGS], description: 'standout = clearly above the rest; steady = solid; needs_attention = low output or overdue follow-ups piling up; inactive = no meaningful activity' },
          summary: str('2-3 sentences on what this person actually did, grounded in the numbers and activity lines'),
          highlights: strs('Up to 3 specific wins or good habits (empty if none)'),
          concerns: strs('Up to 3 specific risks, e.g. overdue follow-ups, no activity, stalled deals (empty if none)'),
          suggestion: str('One concrete coaching suggestion for this person for the next period'),
        },
        required: ['memberId', 'name', 'rating', 'summary', 'highlights', 'concerns', 'suggestion'],
        additionalProperties: false,
      },
    },
    recommendations: strs('2-4 team-level actions for the manager'),
  },
  required: ['headline', 'overview', 'members', 'recommendations'],
  additionalProperties: false,
};

const SYSTEM = `You are a sales manager's analyst inside a CRM. You write a fair, specific, encouraging-but-honest summary of each team member's work for a period, using ONLY the stats and activity lines provided.

Rules:
- Never invent activity, numbers, deals or names. If someone has little or no activity, say so plainly (rating "inactive") without speculating why.
- Judge output relative to role: viewers don't sell; owners/admins may do less hands-on selling.
- Overdue follow-ups on a person's open leads are a real risk — call them out.
- Money is INR; format like ₹1,50,000. Keep each field short and skimmable.`;

// Builds the prompt input from live data (RBAC already checked by the caller).
async function gather(auth: AuthContext, period: Period) {
  const days = PERIODS[period].days;
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  const stats = (await memberStats(auth, days)).filter((m) => m.active || m.counts.total > 0);
  const members = await Promise.all(
    stats.map(async (m) => ({
      memberId: m.id,
      name: m.name,
      role: ROLE_META[m.role].label,
      lastActive: m.lastActive,
      stats: { ...m.counts, wonValueINR: m.wonValue, openLeadsOwned: m.openLeads, overdueFollowUpsOwned: m.overdueFollowUps },
      recentActivity: await recentLinesFor(auth.org.id, m.id, from),
    }))
  );
  return { from, to, members };
}

export async function generateTeamReport(auth: AuthContext, period: Period, now: string) {
  if (!auth.can('activity:view_all')) throw forbidden('Only owners, admins and managers can generate team reports.');
  await connectDB();
  const data = await gather(auth, period);
  const { report, provider } = await withAi(auth, async (ai) => ({
    provider: ai.label,
    report: await ai.json<TeamReportData>({
      system: SYSTEM,
      user: `Workspace: ${auth.org.name}\nPeriod: ${PERIODS[period].label} (${data.from.toISOString()} → ${data.to.toISOString()})\nCurrent local time: ${now}\n\nTeam data (JSON):\n${JSON.stringify(data.members, null, 1)}`,
      schema: SCHEMA,
    }),
  }));
  // Keep only members we actually sent (guards against a model echoing an unknown id).
  const known = new Set(data.members.map((m) => m.memberId));
  const clean: TeamReportData = {
    headline: String(report.headline ?? ''),
    overview: String(report.overview ?? ''),
    members: (report.members ?? []).filter((m) => known.has(m.memberId)),
    recommendations: (report.recommendations ?? []).map(String).slice(0, 4),
  };
  const saved = await TeamReport.create({ orgId: auth.org.id, period, from: data.from, to: data.to, createdBy: auth.user.name, provider, report: clean });
  await logActivity(actorOf(auth), { action: 'ai.team_report', category: 'ai', summary: `Generated an AI team report (${PERIODS[period].label.toLowerCase()})` });
  return toDTO(saved.toObject());
}

const toDTO = (r: { _id: mongoose.Types.ObjectId; period: string; from: Date; to: Date; createdBy: string; provider: string; report: unknown; createdAt: Date }) => ({
  id: String(r._id),
  period: r.period as Period,
  from: new Date(r.from).toISOString(),
  to: new Date(r.to).toISOString(),
  createdBy: r.createdBy,
  provider: r.provider,
  report: r.report as TeamReportData,
  createdAt: new Date(r.createdAt).toISOString(),
});
export type TeamReportDTO = ReturnType<typeof toDTO>;

export async function latestReports(auth: AuthContext) {
  if (!auth.can('activity:view_all')) return {};
  await connectDB();
  const out: Partial<Record<Period, TeamReportDTO>> = {};
  for (const period of Object.keys(PERIODS) as Period[]) {
    const r = await TeamReport.findOne({ orgId: auth.org.id, period }).sort({ createdAt: -1 }).lean();
    if (r) out[period] = toDTO(r);
  }
  return out;
}
