import 'server-only';
import { ApiError, GoogleGenAI, type Content, type FunctionCall, type Part } from '@google/genai';
import { PROVIDERS, type ModelInfo } from './models';
import { AiError, type AiProvider, type ChatRequest, type JsonRequest } from './types';

let client: GoogleGenAI | undefined;
const gemini = () => (client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 120_000 } }));

const MAX_TOOL_ROUNDS = 6;
const BLOCKED = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION']);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The free tier often answers 429/503 under load: retry briefly, then fall back to the other Flash model.
const isBusy = (err: unknown) => err instanceof ApiError && [429, 500, 503].includes(err.status);

async function withFallback<T>(model: string, run: (m: string) => Promise<T>): Promise<T> {
  const order = [model, ...Object.keys(PROVIDERS.gemini.models).filter((m) => m !== model)];
  let lastErr: unknown;
  for (const m of order) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await run(m);
      } catch (err) {
        lastErr = err;
        if (!isBusy(err)) throw err;
        await sleep(800 * (attempt + 1));
      }
    }
  }
  throw lastErr;
}

function describe(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof ApiError) {
    if (isBusy(err)) return new AiError('Gemini is busy or over its free-tier limit. Try again in a minute.', 429);
    if (err.status === 400 && /API key/i.test(err.message)) return new AiError('The Gemini API key is invalid.');
    return new AiError(`Gemini error: ${innerMessage(err.message)}`);
  }
  return new AiError(err instanceof Error ? err.message : 'Gemini request failed.');
}

// Gemini errors can arrive as JSON nested inside JSON strings.
function innerMessage(text: string) {
  let msg = text;
  for (let i = 0; i < 3; i++) {
    try {
      const next = JSON.parse(msg)?.error?.message;
      if (typeof next !== 'string') break;
      msg = next;
    } catch {
      break;
    }
  }
  return msg;
}

export function geminiProvider(model: string, info: ModelInfo): AiProvider {
  return {
    label: info.label.split(' · ')[0],

    async json<T>({ system, user, schema, images = [] }: JsonRequest): Promise<T> {
      try {
        const res = await withFallback(model, (m) =>
          gemini().models.generateContent({
            model: m,
            contents: [{ role: 'user', parts: [...images.map((img) => ({ inlineData: { mimeType: img.mediaType, data: img.data } })), { text: user }] }],
            config: { systemInstruction: system, responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: 8000 },
          })
        );
        if (!res.text) throw new AiError('The AI returned nothing. Please try again.');
        return JSON.parse(res.text) as T;
      } catch (err) {
        if (err instanceof SyntaxError) throw new AiError('The AI reply could not be read. Please try again.');
        throw describe(err);
      }
    },

    async chat({ system, history, tools, onText, onTool }: ChatRequest) {
      const contents: Content[] = history.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] }));
      const functionDeclarations = tools.map((t) => ({ name: t.name, description: t.description, parametersJsonSchema: t.schema }));
      let wrote = false;
      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const stream = await withFallback(model, (m) =>
            gemini().models.generateContentStream({
              model: m,
              contents,
              config: { systemInstruction: system, maxOutputTokens: 8000, ...(tools.length ? { tools: [{ functionDeclarations }] } : {}) },
            })
          );
          const parts: Part[] = [];
          const calls: FunctionCall[] = [];
          let finishReason: string | undefined;
          for await (const chunk of stream) {
            if (chunk.promptFeedback?.blockReason) finishReason = 'SAFETY';
            const candidate = chunk.candidates?.[0];
            if (candidate?.finishReason) finishReason = candidate.finishReason;
            for (const part of candidate?.content?.parts ?? []) {
              parts.push(part); // kept whole (incl. thought signatures) to send back with tool results
              if (part.functionCall) calls.push(part.functionCall);
              else if (part.text && !part.thought) {
                wrote = true;
                onText(part.text);
              }
            }
          }
          if (finishReason && BLOCKED.has(finishReason)) return onText('\n\n_The AI declined to continue this request._');
          if (!calls.length || finishReason === 'MAX_TOKENS') return;

          contents.push({ role: 'model', parts });
          const responses: Part[] = [];
          for (const call of calls) {
            const { content, isError } = await onTool(call.name ?? '', call.args ?? {});
            responses.push({
              functionResponse: { ...(call.id ? { id: call.id } : {}), name: call.name, response: isError ? { error: content } : { result: content } },
            });
          }
          contents.push({ role: 'user', parts: responses });
          if (wrote) onText('\n\n');
        }
      } catch (err) {
        throw describe(err);
      }
    },
  };
}
