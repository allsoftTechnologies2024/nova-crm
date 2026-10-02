import Link from 'next/link';
import Doc, { ContactBlock } from '@/components/legal/Doc';
import { LEGAL } from '@/lib/legal';

export const metadata = { title: 'Terms & Conditions', description: `Terms and conditions for using ${LEGAL.brand}.` };

export default function TermsPage() {
  const b = LEGAL.brand;
  return (
    <Doc
      title="Terms & Conditions"
      intro={
        <>
          These terms govern your use of {b} at {LEGAL.domain} (the “Service”). The Service is operated by {LEGAL.operator}, {LEGAL.entity}, based in {LEGAL.country} (“we”, “us”). By creating an
          account or using the Service you agree to these terms.
        </>
      }
    >
      <h2>1. The Service</h2>
      <p>
        {b} is an online customer relationship management (CRM) software service. It lets teams store and manage sales leads, track activity, and use AI features (lead capture from notes,
        lead scoring, message drafting and an AI assistant). The Service is provided over the internet; nothing is shipped physically.
      </p>

      <h2>2. Eligibility and accounts</h2>
      <ul>
        <li>You must be at least 18 years old and able to enter into a binding contract.</li>
        <li>You are responsible for the accuracy of your account information and for keeping your password secure.</li>
        <li>The person who creates a workspace is its owner and is responsible for the users they invite and the roles they give them.</li>
        <li>Tell us immediately at {LEGAL.email} if you suspect unauthorised access to your account.</li>
      </ul>

      <h2>3. Free trial, plans and payments</h2>
      <ul>
        <li>New workspaces may receive a free trial for the period shown at sign-up. No payment details are required to start a trial.</li>
        <li>
          When the trial ends, the workspace becomes read-only until you buy a plan. Your data is kept and you can still view it; full access returns as soon as payment is confirmed.
        </li>
        <li>
          Plans, prices and limits are listed on our <Link href="/#pricing">pricing section</Link> and inside the app under Billing. Prices are in Indian Rupees (INR) and include applicable taxes
          unless stated otherwise.
        </li>
        <li>
          Payments are processed securely by Razorpay. We do not see or store your card, UPI or bank details. Each payment buys access for the chosen period (monthly or yearly). Plans do not
          renew automatically — you choose whether to pay for the next period.
        </li>
        <li>We may change prices or plans for future periods. Changes never affect a period you have already paid for.</li>
        <li>
          Refunds and cancellations are covered by our <Link href="/refund-policy">Refund & Cancellation Policy</Link>.
        </li>
      </ul>

      <h2>4. Your data</h2>
      <ul>
        <li>You own the data you put into the Service (leads, notes, files and messages). We only use it to provide and improve the Service for you, as described in our <Link href="/privacy">Privacy Policy</Link>.</li>
        <li>You are responsible for having the right to store and process the personal data of your own customers and contacts in the Service.</li>
        <li>We are not responsible for loss of data caused by your own actions (for example deleting records or workspaces).</li>
      </ul>

      <h2>5. AI features</h2>
      <p>
        AI features are powered by third-party models (Anthropic Claude and Google Gemini). AI output can be incomplete or wrong. Review AI-generated content — such as extracted lead details, scores,
        summaries and drafted messages — before relying on it or sending it. AI usage is limited per plan each month.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Service for anything illegal, fraudulent, or to send spam or unsolicited bulk messages;</li>
        <li>upload malware, or try to break, overload, reverse-engineer or gain unauthorised access to the Service or other customers’ data;</li>
        <li>resell or share the Service outside your organisation without our written permission;</li>
        <li>store data you have no right to process.</li>
      </ul>
      <p>We may suspend or close accounts that break these rules, with notice where reasonably possible.</p>

      <h2>7. Availability and changes</h2>
      <p>
        We work to keep the Service available and secure, but it is provided “as is” and “as available”. We may update, add or remove features. We will give reasonable notice of changes that
        significantly reduce what you have paid for.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the extent permitted by law, we are not liable for indirect or consequential losses (such as lost profits, lost business or lost data). Our total liability for any claim relating to the
        Service is limited to the amount you paid us in the 12 months before the claim.
      </p>

      <h2>9. Ending your account</h2>
      <p>
        You can stop using the Service at any time. To delete your workspace and its data, email {LEGAL.email} from the owner’s address. We may close accounts that break these terms or that stay
        unpaid and inactive for a long period, after giving notice to the owner’s email.
      </p>

      <h2>10. Governing law</h2>
      <p>These terms are governed by the laws of India. Disputes are subject to the jurisdiction of the competent courts in India.</p>

      <h2>11. Contact</h2>
      <ContactBlock />
    </Doc>
  );
}
