import { ZodError, type ZodType } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const forbidden = (msg = 'You do not have permission to do that.') => new HttpError(403, msg);
export const notFound = (msg = 'Not found.') => new HttpError(404, msg);

type Handler<P> = (req: Request, ctx: { params: Promise<P> }) => Promise<unknown>;

// Wraps a route handler: returns JSON, and turns thrown HttpError / ZodError into clean responses.
export function route<P = Record<string, string>>(fn: Handler<P>) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    try {
      const out = await fn(req, ctx);
      return out instanceof Response ? out : Response.json(out ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) return Response.json({ message: err.message }, { status: err.status });
      if (err instanceof ZodError) {
        const issue = err.issues[0];
        return Response.json({ message: `${issue.path.join('.') || 'input'}: ${issue.message}` }, { status: 422 });
      }
      // Unique-index race (e.g. two sign-ups with the same email at the same moment).
      if ((err as { code?: number })?.code === 11000) return Response.json({ message: 'That already exists.' }, { status: 409 });
      console.error(err);
      return Response.json({ message: 'Something went wrong.' }, { status: 500 });
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const body = await req.json().catch(() => {
    throw badRequest('Invalid JSON body.');
  });
  return schema.parse(body);
}
