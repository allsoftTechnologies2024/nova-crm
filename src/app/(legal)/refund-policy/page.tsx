import Doc, { ContactBlock } from '@/components/legal/Doc';
import { LEGAL } from '@/lib/legal';

export const metadata = { title: 'Refund & Cancellation Policy', description: `Refunds and cancellations for ${LEGAL.brand} subscriptions.` };

export default function RefundPage() {
  return (
    <Doc
      title="Refund & Cancellation Policy"
      intro={<>We offer a free trial so you can try {LEGAL.brand} fully before paying. This page explains cancellations and when refunds apply.</>}
    >
      <h2>1. Free trial</h2>
      <p>New workspaces get a free trial. You are not charged during the trial and no payment details are needed to start it.</p>

      <h2>2. How payments work</h2>
      <p>
        Each payment buys access to a plan for one period — one month or one year — starting immediately. A one-time payment <strong>does not renew</strong>. If you turn on{' '}
        <strong>Autopay</strong> in Billing, the same plan renews automatically at the end of each period using your card or UPI Autopay mandate, until you turn it off.
      </p>

      <h2>3. Cancellation</h2>
      <ul>
        <li>You can stop using the Service at any time. If Autopay is on, turn it off in Billing (or ask us) to stop future charges — it takes effect before the next renewal.</li>
        <li>Your paid access continues until the end of the period you paid for. After that, the workspace becomes read-only until you pay again; your data is kept.</li>
        <li>
          To close your account and delete your data, email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> from the workspace owner’s email address.
        </li>
      </ul>

      <h2>4. Refunds</h2>
      <p>Because you can try the full product free before paying, payments are generally non-refundable, and we do not refund unused parts of a period. We will give a full refund if:</p>
      <ul>
        <li>you were charged more than once for the same order (duplicate payment);</li>
        <li>money was debited but your plan was not activated, and we cannot activate it;</li>
        <li>a serious problem on our side stopped you from using the Service and we could not fix it within a reasonable time.</li>
      </ul>

      <h2>5. How to request a refund</h2>
      <ol>
        <li>
          Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> within 7 days of the payment, with your workspace name and the Razorpay payment ID (shown in Billing and in your payment
          receipt).
        </li>
        <li>We reply within 2 business days.</li>
        <li>
          Approved refunds are processed within {LEGAL.refundWindowDays} business days to the original payment method. Your bank may take a few more days to show the credit.
        </li>
      </ol>

      <h2>6. Contact</h2>
      <ContactBlock />
    </Doc>
  );
}
