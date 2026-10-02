import 'server-only';
import type { AuthContext } from '@/lib/auth/session';
import { connectDB } from '@/lib/db';
import { HttpError } from '@/lib/http';
import { limitLabel } from '@/lib/plans';
import { Organization } from '@/models/Organization';
import { claudeProvider } from './claude';
import { geminiProvider } from './gemini';
import { getSettings } from '@/lib/services/plans';
import { PROVIDERS, modelKey, parseModelKey, type ProviderId } from './models';
import { AiError, type AiProvider } from './types';

export const providerConfigured = (p: ProviderId) => Boolean(process.env[PROVIDERS[p].envKey]);

export interface AiPolicy {
  allowed: string[] | null; // platform override for this workspace; null = follow the platform list
  locked: boolean; // workspace can't change its model
}

export interface ModelChoice {
  key: string; // "provider:model"
  provider: ProviderId;
  model: string;
  label: string;
  inrPerAction: number;
  configured: boolean; // the provider's API key is set on the server
}

// Models this workspace may use: its own override list, or the platform's enabled list.
export async function modelChoices(policy: AiPolicy): Promise<ModelChoice[]> {
  const settings = await getSettings();
  const keys = policy.allowed ?? settings.ai.enabledModels;
  return keys.flatMap((key) => {
    const parsed = parseModelKey(key);
    if (!parsed) return [];
    const info = PROVIDERS[parsed.provider].models[parsed.model];
    return [{ key, ...parsed, label: info.label, inrPerAction: info.inrPerAction, configured: providerConfigured(parsed.provider) }];
  });
}

// The model a workspace actually runs: its own choice if allowed and configured, else the platform default,
// else the first allowed model with an API key. null = no usable model.
export async function resolveForOrg(org: { ai: { provider: ProviderId; model: string }; aiPolicy: AiPolicy }) {
  const settings = await getSettings();
  const usable = (await modelChoices(org.aiPolicy)).filter((c) => c.configured);
  const own = org.ai.model ? modelKey(org.ai.provider, org.ai.model) : '';
  const pick = usable.find((c) => c.key === own) ?? usable.find((c) => c.key === settings.ai.defaultModel) ?? usable[0];
  if (!pick) return null;
  return { key: pick.key, provider: pick.provider, model: pick.model, info: PROVIDERS[pick.provider].models[pick.model] };
}

export async function getProvider(auth: AuthContext): Promise<AiProvider> {
  const picked = await resolveForOrg(auth.org);
  if (!picked) throw new HttpError(503, 'No AI model is available for this workspace. Ask your platform admin to enable one.');
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
  const ai = await getProvider(auth);
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
