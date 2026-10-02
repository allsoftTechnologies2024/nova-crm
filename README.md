# LeadPilot — AI-first SaaS CRM

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · MongoDB · Claude + Gemini · Razorpay.

A multi-tenant lead-management SaaS where AI does the data entry: paste notes, dictate, or snap a business card and
leads appear; tell the AI what happened on a call and the lead updates itself; a Copilot reads your pipeline and acts on it.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI, AUTH_SECRET, and at least one AI key
npm run dev                  # http://localhost:3000 → "Start free" creates a workspace + owner
```

`AUTH_SECRET`: `openssl rand -base64 32`. MongoDB Atlas free tier works for `MONGODB_URI`.

| Variable | Needed for |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude (console.anthropic.com) |
| `GEMINI_API_KEY` | Gemini (aistudio.google.com, free tier) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Plan upgrades (use test keys in development) |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook → `POST /api/billing/webhook`, events `payment.captured`, `order.paid` |

## Features

**AI (Claude or Gemini, chosen per workspace in Settings)**
- **AI capture** — notes, email/WhatsApp threads, voice dictation or photos (business cards, notebook pages) → lead drafts to review and save.
- **Tell AI what happened** — free-text update → stage, value, follow-up time, tags and a timeline entry.
- **Lead scoring** — 0–100 score, summary and next best action, saved on the lead.
- **Follow-up writer** — email or WhatsApp drafts from the lead's history, opened in mail / WhatsApp.
- **Copilot** — streaming chat with tools (`search_leads`, `get_lead`, `pipeline_summary`, `due_followups`, `update_lead`, `create_lead`).
  Tools go through the same RBAC-scoped services as the UI, and tools a role can't use are never offered.
  Chat history is saved per user (private) in MongoDB. The server rebuilds context from the saved chat, so the browser can't inject fake history.
- **Metering** — every AI action uses one credit from the plan's monthly allowance (atomic in MongoDB, refunded if the AI call fails).

**RBAC** — `owner`, `admin`, `manager`, `agent`, `viewer`, defined in one matrix ([src/lib/rbac.ts](src/lib/rbac.ts)).
Agents only see leads assigned to or created by them. Roles are re-read from the database on every request, so a demotion or deactivation applies immediately.
Nobody can grant a role at or above their own.

**Billing** — Razorpay Checkout using Orders. The browser callback is verified with an HMAC signature, and the webhook is verified with the webhook secret.
Activation is idempotent (an order is marked paid only once) and renewals stack on the remaining time. Plan limits cover seats, leads and AI actions ([src/lib/plans.ts](src/lib/plans.ts)).

## Architecture

```
src/
  proxy.ts                 optimistic redirect for /app (real checks happen server-side)
  app/
    page.tsx               landing page
    (auth)/login, signup
    app/                   the product: dashboard, leads (board/list), lead detail, copilot, team, billing, settings
    api/                   thin route handlers: auth → validate (zod) → service
  lib/
    rbac.ts  plans.ts  lead-meta.ts      pure, shared by server + client
    http.ts                route() wrapper: HttpError / ZodError → JSON responses
    auth/                  jose session cookie (token.ts is edge-safe), getAuth / requireAuth / requirePage
    services/              domain logic, all RBAC scoping + plan limits live here (leads, team, billing)
    ai/
      models.ts            provider/model registry
      types.ts             provider-neutral AiProvider contract (json + chat)
      claude.ts gemini.ts  adapters (structured JSON output, streaming tool loop, retries/fallbacks, readable errors)
      index.ts             provider resolution + credit metering (withAi)
      features.ts          capture / update / score / draft prompts + JSON schemas
      copilot.ts           Copilot tools (zod-validated, permission-gated) + system prompt
  models/                  Organization, User, Lead, Payment (Mongoose)
  components/              ui primitives, app shell, leads, ai
```

Rules that keep it maintainable:
- Pages (server components) and API routes both call `lib/services/*`, so permissions are enforced in one place.
- Client components never import server code; shared vocabulary lives in `lead-meta.ts`, `rbac.ts` and `plans.ts`.
- To add an AI provider, implement `AiProvider` in `lib/ai/` and register it in `models.ts`.

### Claude specifics
Default model is `claude-opus-5-5`, and `claude-sonnet-5-5` and `claude-haiku-4-5` are selectable in Settings. Opus and Sonnet run at `effort: "low"`,
which suits CRM-sized tasks, with server-side refusal fallback enabled (`fallbacks: "default"`). The Copilot system prompt is prompt-cached.
