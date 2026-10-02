// AI model registry — plain data, safe to import from client components.

export type ProviderId = 'claude' | 'gemini';

export interface ModelInfo {
  label: string;
  effort?: 'low' | 'medium' | 'high'; // Claude effort (not supported on Haiku 4.5)
  fallbacks?: boolean; // Claude server-side refusal fallback
}

export const PROVIDERS: Record<ProviderId, { label: string; envKey: string; defaultModel: string; models: Record<string, ModelInfo> }> = {
  claude: {
    label: 'Claude (Anthropic)',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-opus-5-5',
    models: {
      'claude-opus-5-5': { label: 'Claude Opus 5.5 · smartest', effort: 'low', fallbacks: true },
      'claude-sonnet-5-5': { label: 'Claude Sonnet 5.5 · balanced', effort: 'low', fallbacks: true },
      'claude-haiku-4-5': { label: 'Claude Haiku 4.5 · fastest' },
    },
  },
  gemini: {
    label: 'Gemini (Google)',
    envKey: 'GEMINI_API_KEY',
    defaultModel: 'gemini-flash-latest',
    models: {
      'gemini-flash-latest': { label: 'Gemini Flash · free tier' },
      'gemini-flash-lite-latest': { label: 'Gemini Flash-Lite · fastest' },
    },
  },
};

export const modelOptions = () =>
  (Object.keys(PROVIDERS) as ProviderId[]).flatMap((provider) =>
    Object.entries(PROVIDERS[provider].models).map(([model, info]) => ({ provider, model, label: info.label }))
  );
