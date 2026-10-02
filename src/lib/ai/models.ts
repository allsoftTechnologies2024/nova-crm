// AI model registry — plain data, safe to import from client components.

export type ProviderId = 'claude' | 'gemini';

export interface ModelInfo {
  label: string;
  effort?: 'low' | 'medium' | 'high'; // Claude effort (not supported on Haiku 4.5)
  fallbacks?: boolean; // Claude server-side refusal fallback
  inrPerAction: number; // rough cost of one AI action (≈3k input + 800 output tokens), for the platform console
}

export const PROVIDERS: Record<ProviderId, { label: string; envKey: string; defaultModel: string; models: Record<string, ModelInfo> }> = {
  claude: {
    label: 'Claude (Anthropic)',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-opus-5-5',
    models: {
      'claude-opus-5-5': { label: 'Claude Opus 5.5 · smartest', effort: 'low', fallbacks: true, inrPerAction: 2.6 },
      'claude-sonnet-5-5': { label: 'Claude Sonnet 5.5 · balanced', effort: 'low', fallbacks: true, inrPerAction: 1.3 },
      'claude-haiku-4-5': { label: 'Claude Haiku 4.5 · fastest', inrPerAction: 0.65 },
    },
  },
  gemini: {
    label: 'Gemini (Google)',
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-flash-latest',
    models: {
      'gemini-flash-latest': { label: 'Gemini Flash · free tier', inrPerAction: 1.0 },
      'gemini-flash-lite-latest': { label: 'Gemini Flash-Lite · fastest', inrPerAction: 0.3 },
    },
  },
};

// A model is identified as "provider:model", e.g. "gemini:gemini-flash-latest".
export const modelKey = (provider: ProviderId, model: string) => `${provider}:${model}`;
export const ALL_MODEL_KEYS = (Object.keys(PROVIDERS) as ProviderId[]).flatMap((p) => Object.keys(PROVIDERS[p].models).map((m) => modelKey(p, m)));
export function parseModelKey(key: string): { provider: ProviderId; model: string } | null {
  const [provider, model] = key.split(':') as [ProviderId, string];
  return PROVIDERS[provider]?.models[model] ? { provider, model } : null;
}

export const modelOptions = () =>
  (Object.keys(PROVIDERS) as ProviderId[]).flatMap((provider) =>
    Object.entries(PROVIDERS[provider].models).map(([model, info]) => ({ provider, model, label: info.label }))
  );
