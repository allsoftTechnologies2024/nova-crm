import Doc, { ContactBlock } from '@/components/legal/Doc';
import { LEGAL } from '@/lib/legal';

export const metadata = { title: 'Shipping & Delivery Policy', description: `How ${LEGAL.brand} is delivered.` };

export default function ShippingPage() {
  return (
    <Doc title="Shipping & Delivery Policy" intro={<>{LEGAL.brand} is online software. There are no physical goods and nothing is shipped.</>}>
      <h2>1. Delivery</h2>
      <ul>
        <li>The Service is delivered digitally through your web browser at {LEGAL.domain}.</li>
        <li>Your account is available immediately after you sign up.</li>
        <li>After a successful payment, your plan is activated automatically, usually within a few minutes, and you can see it under Billing in the app.</li>
        <li>No shipping charges apply.</li>
      </ul>

      <h2>2. If your plan isn’t activated</h2>
      <p>
        If your payment succeeded but your plan isn’t active within 24 hours, email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> with your workspace name and the Razorpay payment ID. We will
        activate it or refund the payment, as described in our Refund & Cancellation Policy.
      </p>

      <h2>3. Contact</h2>
      <ContactBlock />
    </Doc>
  );
}
