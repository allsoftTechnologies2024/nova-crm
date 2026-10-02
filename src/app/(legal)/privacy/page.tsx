import Doc, { ContactBlock } from '@/components/legal/Doc';
import { LEGAL } from '@/lib/legal';

export const metadata = { title: 'Privacy Policy', description: `How ${LEGAL.brand} collects, uses and protects your data.` };

export default function PrivacyPage() {
  const b = LEGAL.brand;
  return (
    <Doc
      title="Privacy Policy"
      intro={
        <>
          This policy explains what data {b} ({LEGAL.domain}), operated by {LEGAL.operator}, collects, why, and the choices you have.
        </>
      }
    >
      <h2>1. What we collect</h2>
      <h3>Account information</h3>
      <p>Your name, email address, company / workspace name, and a securely hashed version of your password (we never store it in plain text).</p>
      <h3>Workspace data you add</h3>
      <p>Leads and their contact details, notes, activity history, AI chat messages and anything else you or your team enter. You control this data.</p>
      <h3>Payment information</h3>
      <p>
        Payments are handled by Razorpay. We receive the order and payment reference, plan, amount and status — never your card, UPI or bank account details.
      </p>
      <h3>Technical information</h3>
      <p>Basic logs needed to run and secure the Service, such as IP address, browser type and sign-in times.</p>

      <h2>2. How we use it</h2>
      <ul>
        <li>to provide the Service: store your data, run AI features, enforce plan limits and process payments;</li>
        <li>to keep accounts secure (sign-in protection, preventing abuse) and to keep an activity log inside your workspace;</li>
        <li>to send service emails, such as password-reset links and important account notices;</li>
        <li>to respond to support requests.</li>
      </ul>
      <p>We do not sell your data and we do not use your workspace data for advertising.</p>

      <h2>3. Services we share data with</h2>
      <p>We use trusted providers only as needed to run the Service:</p>
      <ul>
        <li>
          <strong>AI providers</strong> — Anthropic (Claude) and Google (Gemini). When you use an AI feature, the relevant text (and images you attach) is sent to the provider to generate the result.
        </li>
        <li>
          <strong>Razorpay</strong> — payment processing.
        </li>
        <li>
          <strong>MongoDB Atlas</strong> — secure cloud database where your data is stored.
        </li>
        <li>
          <strong>Hosting and email providers</strong> — to serve the website and send account emails.
        </li>
      </ul>
      <p>We may also disclose data if required by law.</p>

      <h2>4. Cookies</h2>
      <p>
        We use only essential cookies: one to keep you signed in, and small preference cookies (for example whether the sidebar is collapsed). We do not use advertising or third-party tracking
        cookies.
      </p>

      <h2>5. Security</h2>
      <p>
        Data is sent over HTTPS, passwords are hashed, access inside a workspace is controlled by roles, and sign-in attempts are rate-limited. No system is perfectly secure, but we take reasonable
        measures to protect your data.
      </p>

      <h2>6. Retention and deletion</h2>
      <p>
        We keep your data while your workspace exists. Workspace owners can ask us to delete the workspace and all its data by emailing {LEGAL.email}; we will do so within 30 days, except where we
        must keep certain records (such as payment records) by law.
      </p>

      <h2>7. Your rights</h2>
      <p>You can access and correct your account details in Settings, and you can ask us for a copy of your data or for its deletion by contacting us.</p>

      <h2>8. Children</h2>
      <p>The Service is for businesses and is not intended for anyone under 18.</p>

      <h2>9. Changes</h2>
      <p>We may update this policy. Significant changes will be shown on this page with a new “last updated” date.</p>

      <h2>10. Contact</h2>
      <ContactBlock />
    </Doc>
  );
}
