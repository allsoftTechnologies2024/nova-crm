import 'server-only';
import { z } from 'zod';
import { providerConfigured } from '@/lib/ai';
import { ALL_MODEL_KEYS, PROVIDERS, parseModelKey } from '@/lib/ai/models';
import { connectDB } from '@/lib/db';
import { badRequest } from '@/lib/http';
import { getSettings, invalidatePlans } from '@/lib/services/plans';
import { Organization } from '@/models/Organization';
import { PlatformSettings } from '@/models/PlatformSettings';
import type { AdminContext } from '../auth/session';
import { audit } from './audit';

// Platform-wide AI model catalogue: which models workspaces may use and the default.

export const modelKeySchema = z.string().refine((k) => ALL_MODEL_KEYS.includes(k), 'Unknown AI model');
export const aiSettingsSchema = z.object({ enabledModels: z.array(modelKeySchema).min(1, 'Enable at least one model'), defaultModel: modelKeySchema });

export async function aiCatalog() {
  await connectDB();
  const settings = await getSettings();
  // Workspaces whose saved choice is each model, and how many have a custom policy.
  const [choices, custom, locked] = await Promise.all([
    Organization.aggregate<{ _id: { p: string; m: string }; n: number }>([{ $match: { 'ai.model': { $nin: ['', null] } } }, { $group: { _id: { p: '$ai.provider', m: '$ai.model' }, n: { $sum: 1 } } }]),
    Organization.countDocuments({ 'aiPolicy.allowed.0': { $exists: true } }),
    Organization.countDocuments({ 'aiPolicy.locked': true }),
  ]);
  const models = ALL_MODEL_KEYS.map((key) => {
    const { provider, model } = parseModelKey(key)!;
    const info = PROVIDERS[provider].models[model];
    return {
      key,
      provider,
      providerLabel: PROVIDERS[provider].label,
      label: info.label,
      inrPerAction: info.inrPerAction,
      configured: providerConfigured(provider),
      enabled: settings.ai.enabledModels.includes(key),
      isDefault: settings.ai.defaultModel === key,
      chosenBy: choices.find((c) => `${c._id.p}:${c._id.m}` === key)?.n ?? 0,
    };
  });
  return { models, defaultModel: settings.ai.defaultModel, overrides: { custom, locked } };
}

export async function updateAiSettings(actor: AdminContext, input: z.infer<typeof aiSettingsSchema>) {
  await connectDB();
  const enabled = [...new Set(input.enabledModels)];
  if (!enabled.includes(input.defaultModel)) throw badRequest('The default model must be one of the enabled models.');
  if (!providerConfigured(parseModelKey(input.defaultModel)!.provider)) throw badRequest("The default model's API key isn't set on the server.");
  await PlatformSettings.updateOne({ key: 'global' }, { $set: { 'ai.enabledModels': enabled, 'ai.defaultModel': input.defaultModel } }, { upsert: true });
  await invalidatePlans(); // bumps the settings version so every server reloads
  await audit(actor, 'ai.settings', 'platform', 'global', `AI models enabled: ${enabled.join(', ')} · default ${input.defaultModel}`);
}
