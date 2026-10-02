import mongoose from 'mongoose';

// Cache the connection across hot reloads and serverless invocations.
const g = globalThis as unknown as { _mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } };
const cached = (g._mongoose ??= { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set. Add it to .env.local.');
  cached.promise ??= mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

// Registers a model. In development, hot reload re-runs model files with an updated schema, but
// mongoose.models keeps the stale compiled model (silently dropping new fields) — so rebuild it.
// `schema` is typed loosely on purpose: comparing full Mongoose schema generics makes tsc run out of memory.
export function defineModel<T>(name: string, schema: object): mongoose.Model<T> {
  if (mongoose.models[name]) {
    if (process.env.NODE_ENV === 'production') return mongoose.models[name] as unknown as mongoose.Model<T>;
    mongoose.deleteModel(name);
  }
  return mongoose.model(name, schema as mongoose.Schema) as unknown as mongoose.Model<T>;
}
