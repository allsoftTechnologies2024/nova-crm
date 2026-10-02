import Link from 'next/link';
import { When } from '@/components/ui';
import { formatINR } from '@/lib/plans';
import { allPlans } from '@/lib/services/plans';
import { listPayments } from '@/platform/services/payments';

export const metadata = { title: 'Payments' };

export default async function PaymentsPage() {
  const [payments, plans] = await Promise.all([listPayments(), allPlans()]);
  const names = new Map(plans.map((p) => [p.id, p.name]));
  const paid = payments.filter((p) => p.status === 'paid');
  return (
    <div className="space-y-5">
      <p className="text-sm font-medium text-muted">
        {paid.length} paid · {formatINR(paid.reduce((a, p) => a + p.amount, 0))} collected · {payments.length - paid.length} unpaid checkouts
      </p>
      <div className="card scroll-thin overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              {['Workspace', 'Plan', 'Amount', 'Status', 'Razorpay order / payment', 'Date'].map((h) => (
                <th key={h} className="px-5 py-3.5 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3">
                  <Link href={`/admin/workspaces/${p.org.id}`} className="font-bold hover:text-brand">
                    {p.org.name}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  {names.get(p.plan) ?? p.plan} <span className="text-muted">· {p.period}</span>
                </td>
                <td className="px-5 py-3 font-semibold tabular-nums">{formatINR(p.amount)}</td>
                <td className="px-5 py-3">
                  <span className={`chip ${p.status === 'paid' ? 'bg-success/10 text-success ring-success/20' : 'bg-surface-2 text-muted ring-line'}`}>{p.status}</span>
                </td>
                <td className="px-5 py-3 font-mono text-xs text-muted">
                  {p.orderId}
                  {p.paymentId && <span className="block">{p.paymentId}</span>}
                </td>
                <td className="px-5 py-3">
                  <When value={p.at} />
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-muted">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
