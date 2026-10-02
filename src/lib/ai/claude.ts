import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { ModelInfo } from './models';
import { AiError, type AiProvider, type ChatRequest, type JsonRequest } from './types';

let client: Anthropic | undefined;
// Bounded so a network outage fails in minutes, not the SDK default of 10 min × retries.
const anthropic = () => (client ??= new Anthropic({ timeout: 120_000, maxRetries: 2 }));

const MAX_TOOL_ROUNDS = 6;

// Effort + server-side refusal fallback for the models that support them.
function modelParams(info: ModelInfo) {
  return {
    ...(info.effort ? { output_config: { effort: info.effort } } : {}),
    ...(info.fallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
  };
}

function describe(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof Anthropic.AuthenticationError) return new AiError('The Claude API key is invalid.', 502);
  if (err instanceof Anthropic.RateLimitError) return new AiError('Claude is rate-limited right now. Try again in a minute.', 429);
  if (err instanceof Anthropic.APIError) {
    const detail = (err.error as { error?: { message?: string } })?.error?.message || err.message;
    return new AiError(err.status === 529 ? 'Claude is overloaded. Try again shortly.' : `Claude error: ${detail}`, err.status && err.status >= 500 ? 503 : 502);
  }
  return new AiError(err instanceof Error ? err.message : 'Claude request failed.');
}

export function claudeProvider(model: string, info: ModelInfo): AiProvider {
  const { output_config, ...rest } = modelParams(info);

  return {
    label: info.label.split(' · ')[0],

    async json<T>({ system, user, schema, images = [] }: JsonRequest): Promise<T> {
      try {
        const res = await anthropic().beta.messages.create({
          model,
          max_tokens: 16000,
          system,
          messages: [
            {
              role: 'user',
              content: [
                ...images.map((img) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: img.mediaType, data: img.data } })),
                { type: 'text' as const, text: user },
              ],
            },
          ],
          output_config: { ...output_config, format: { type: 'json_schema', schema } },
          ...rest,
        });
        if (res.stop_reason === 'refusal') throw new AiError('The AI declined this request. Please enter the details manually.', 422);
        if (res.stop_reason === 'max_tokens') throw new AiError('Too much input at once — try a shorter text.', 422);
        const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
        return JSON.parse(text) as T;
      } catch (err) {
        if (err instanceof SyntaxError) throw new AiError('The AI reply could not be read. Please try again.');
        throw describe(err);
      }
    },

    async chat({ system, history, tools, onText, onTool }: ChatRequest) {
      const messages: Anthropic.Beta.BetaMessageParam[] = history.map((t) => ({ role: t.role, content: t.content }));
      const toolDefs: Anthropic.Beta.BetaTool[] = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.schema as Anthropic.Beta.BetaTool.InputSchema,
        eager_input_streaming: true,
      }));
      let wrote = false;
      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const stream = anthropic().beta.messages.stream({
            model,
            max_tokens: 16000,
            // Stable instructions are cached; the per-request context lives in the first user turn.
            system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
            messages,
            tools: toolDefs,
            ...(output_config ? { output_config } : {}),
            ...rest,
          });
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              wrote = true;
              onText(event.delta.text);
            }
          }
          const msg = await stream.finalMessage();
          if (msg.stop_reason === 'refusal') return onText('\n\n_The AI declined to continue this request._');
          const calls = msg.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
          // A truncated turn may contain a half-written tool call — never run it.
          if (msg.stop_reason !== 'tool_use' || !calls.length) return;

          messages.push({ role: 'assistant', content: msg.content as Anthropic.Beta.BetaContentBlockParam[] });
          const results = await Promise.all(
            calls.map(async (call) => {
              const { content, isError } = await onTool(call.name, call.input);
              return { type: 'tool_result' as const, tool_use_id: call.id, content, ...(isError ? { is_error: true } : {}) };
            })
          );
          messages.push({ role: 'user', content: results });
          if (wrote) onText('\n\n');
        }
      } catch (err) {
        throw describe(err);
      }
    },
  };
}
