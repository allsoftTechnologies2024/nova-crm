import 'server-only';
import type { AuthContext } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { HttpError } from '@/lib/http';
import { limitLabel } from '@/lib/plans';
import { Organization } from '@/models/Organization';
import { claudeProvider } from './claude';
import { geminiProvider } from './gemini';
import { PROVIDERS, type ProviderId } from './models';
import { AiError, type AiProvider } from './types';

export const providerConfigured = (p: ProviderId) => Boolean(process.env[PROVIDERS[p].envKey]);

// The workspace's chosen provider/model, falling back to whichever provider has a key.
export function resolveModel(choice: { provider: ProviderId; model: string }) {
  const order: ProviderId[] = [choice.provider, ...(Object.keys(PROVIDERS) as ProviderId[]).filter((p) => p !== choice.provider)];
  const provider = order.find(providerConfigured);
  if (!provider) return null;
  const p = PROVIDERS[provider];
  const model = provider === choice.provider && p.models[choice.model] ? choice.model : p.defaultModel;
  return { provider, model, info: p.models[model] };
}

export function getProvider(auth: AuthContext): AiProvider {
  const picked = resolveModel(auth.org.ai);
  if (!picked) throw new HttpError(503, 'No AI is configured. Set ANTHROPIC_API_KEY or GEMINI_API_KEY in .env.local.');
  return picked.provider === 'claude' ? claudeProvider(picked.model, picked.info) : geminiProvider(picked.model, picked.info);
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

// Atomically takes one AI credit from the workspace's monthly allowance.
async function takeCredit(auth: AuthContext) {
  await connectDB();
  const month = currentMonth();
  const limit = auth.plan.limits.aiCredits;
  const sameMonth = await Organization.updateOne(
    { _id: auth.org.id, 'aiUsage.month': month, 'aiUsage.count': { $lt: limit } },
    { $inc: { 'aiUsage.count': 1 } }
  );
  if (sameMonth.modifiedCount) return;
  const newMonth = await Organization.updateOne({ _id: auth.org.id, 'aiUsage.month': { $ne: month } }, { $set: { aiUsage: { month, count: 1 } } });
  if (newMonth.modifiedCount) return;
  throw new HttpError(402, `You've used all ${limitLabel(limit)} AI actions on the ${auth.plan.name} plan this month. Upgrade in Billing for more.`);
}

const refundCredit = (auth: AuthContext) =>
  Organization.updateOne({ _id: auth.org.id, 'aiUsage.month': currentMonth(), 'aiUsage.count': { $gt: 0 } }, { $inc: { 'aiUsage.count': -1 } });

// Runs one metered AI action: requires ai:use, charges a credit, refunds it if the AI call fails.
export async function withAi<T>(auth: AuthContext, run: (ai: AiProvider) => Promise<T>): Promise<T> {
  if (!auth.can('ai:use')) throw new HttpError(403, 'Your role cannot use AI features.');
  const ai = getProvider(auth);
  await takeCredit(auth);
  try {
    return await run(ai);
  } catch (err) {
    await refundCredit(auth).catch(() => {});
    if (err instanceof AiError) throw new HttpError(err.status, err.message);
    throw err;
  }
}

export function aiUsage(auth: AuthContext) {
  const used = auth.org.aiUsage.month === currentMonth() ? auth.org.aiUsage.count : 0;
  return { used, limit: auth.plan.limits.aiCredits };
}
