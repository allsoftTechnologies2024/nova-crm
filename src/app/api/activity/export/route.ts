import { requireAuth } from '@/lib/auth/session';
import { route } from '@/lib/http';
import { listActivity } from '@/lib/services/activity';

const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;

// CSV download of the filtered log (up to 5,000 rows, newest first).
export const GET = route(async (req) => {
  const auth = await requireAuth();
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const rows = [];
  let before: string | undefined;
  for (let page = 0; page < 25; page++) {
    const { items, nextCursor } = await listActivity(auth, { ...params, before, limit: 200 });
    rows.push(...items);
    if (!nextCursor) break;
    before = nextCursor;
  }
  const csv = [
    ['Time (UTC)', 'Member', 'Category', 'Action', 'Summary', 'Record'].join(','),
    ...rows.map((r) => [r.at, r.actor.name, r.category, r.action, r.summary, r.entity?.label ?? ''].map((v) => cell(String(v))).join(',')),
  ].join('\n');
  return new Response(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="activity-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
});
