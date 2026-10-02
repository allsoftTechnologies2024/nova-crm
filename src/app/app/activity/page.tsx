import ActivityView from '@/components/activity/ActivityView';
import { latestReports, PERIODS, type Period } from '@/lib/ai/team-report';
import { requirePage } from '@/lib/auth/session';
import { listActivity, memberStats } from '@/lib/services/activity';

export const metadata = { title: 'Activity' };

export default async function ActivityPage() {
  const auth = await requirePage();
  const viewAll = auth.can('activity:view_all');
  const periods = Object.keys(PERIODS) as Period[];
  const [initial, reports, ...stats] = await Promise.all([
    listActivity(auth, { limit: 50 }),
    latestReports(auth),
    ...periods.map((p) => memberStats(auth, PERIODS[p].days)),
  ]);

  return (
    <ActivityView
      viewAll={viewAll}
      canGenerate={viewAll && auth.can('ai:use')}
      initial={initial}
      reports={reports}
      stats={Object.fromEntries(periods.map((p, i) => [p, stats[i]])) as Record<Period, (typeof stats)[number]>}
    />
  );
}
