// Browser-side helpers (safe to import from client components).

export async function api<T = { ok: true }>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data as T;
}

// Remembers the collapsed/expanded sidebar; read by the server layout so there's no flash on load.
export const SIDEBAR_COOKIE = 'sidebar';

export const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong.');

// "Now" as the browser sees it, so the AI can resolve "call back tomorrow evening".
export const localNow = () => new Date().toString();

const pad = (n: number) => String(n).padStart(2, '0');
// Date → "YYYY-MM-DDTHH:mm" in local time (what <input type="datetime-local"> uses).
export function toLocalInput(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

export const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
export const compactInr = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : n >= 1e3 ? `₹${(n / 1e3).toFixed(0)}k` : `₹${n}`;

export function formatWhen(value: string) {
  const d = new Date(value);
  const now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(now)) / 86_400_000);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (diff === 0) return `Today ${time}`;
  if (diff === 1) return `Tomorrow ${time}`;
  if (diff === -1) return `Yesterday ${time}`;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} ${time}`;
}

export function timeAgo(value: string) {
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : days < 30 ? `${days}d ago` : new Date(value).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export const isOverdue = (value: string | null) => Boolean(value && new Date(value) < new Date());

export async function fileToImage(file: File) {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return { mediaType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data, name: file.name };
}
