// Provider-neutral contract implemented by ai/claude.ts and ai/gemini.ts.

export type JsonSchema = Record<string, unknown>;

export interface ImageInput {
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
  data: string; // base64, no data: prefix
}

export interface JsonRequest {
  system: string;
  user: string;
  schema: JsonSchema;
  images?: ImageInput[];
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolDef {
  name: string;
  description: string;
  schema: JsonSchema; // JSON Schema for the input object
}

export type ToolResult = { content: string; isError?: boolean };

export interface ChatRequest {
  system: string;
  history: ChatTurn[]; // ends with the new user message
  tools: ToolDef[];
  onText: (chunk: string) => void;
  onTool: (name: string, input: unknown) => Promise<ToolResult>;
}

export interface AiProvider {
  label: string;
  json<T>(req: JsonRequest): Promise<T>;
  chat(req: ChatRequest): Promise<void>;
}

// Thrown by adapters with a message that is safe to show the user.
export class AiError extends Error {
  constructor(
    message: string,
    public status = 502
  ) {
    super(message);
  }
}
