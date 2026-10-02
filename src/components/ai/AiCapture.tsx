'use client';

import { Check, ImagePlus, Sparkles, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { ErrorText, PriorityDot, StatusChip } from '@/components/ui';
import { api, errorText, fileToImage, formatWhen, inr, localNow } from '@/lib/client';
import { LEAD_PRIORITIES, LEAD_STATUSES, type LeadPriority, type LeadStatus } from '@/lib/lead-meta';
import VoiceButton from './VoiceButton';

interface Parsed {
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  need: string;
  value: number;
  status: string;
  priority: string;
  nextFollowUp: string;
  tags: string[];
  note: string;
}
type Img = Awaited<ReturnType<typeof fileToImage>>;

const EXAMPLE = `Met Rahul Mehta (Mehta Logistics) at the expo — 40 trucks, wants fleet tracking, budget around 3L. Call him Thursday afternoon. rahul@mehtalogistics.in
Also: Ananya from Bloom Clinics, 98450 12345, asked for a demo of the appointment module next week. Referral from Karan.`;

const isStatus = (s: string): s is LeadStatus => (LEAD_STATUSES as readonly string[]).includes(s);
const isPriority = (s: string): s is LeadPriority => (LEAD_PRIORITIES as readonly string[]).includes(s);

// Paste notes, dictate, or snap a business card → AI drafts leads → review → save.
export default function AiCapture({ onDone }: { onDone: (count: number) => void }) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<Img[]>([]);
  const [drafts, setDrafts] = useState<(Parsed & { keep: boolean })[] | null>(null);
  const [provider, setProvider] = useState('');
  const [busy, setBusy] = useState<'' | 'read' | 'save'>('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith('image/') && f.size < 5_000_000);
    const next = await Promise.all(list.map(fileToImage));
    setImages((cur) => [...cur, ...next].slice(0, 4));
  }

  async function read() {
    setBusy('read');
    setError('');
    try {
      const res = await api<{ provider: string; leads: Parsed[] }>('/api/ai/capture', {
        body: { text, now: localNow(), images: images.map(({ mediaType, data }) => ({ mediaType, data })) },
      });
      if (!res.leads.length) throw new Error('No leads found in those notes.');
      setDrafts(res.leads.map((l) => ({ ...l, keep: true })));
      setProvider(res.provider);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy('');
    }
  }

  async function save() {
    const keep = drafts!.filter((d) => d.keep);
    if (!keep.length) return;
    setBusy('save');
    setError('');
    try {
      await api('/api/leads', {
        body: {
          via: 'ai',
          leads: keep.map((d) => ({
            name: d.name,
            company: d.company,
            email: /\S+@\S+\.\S+/.test(d.email) ? d.email : '',
            phone: d.phone,
            source: d.source,
            need: [d.need, d.note].filter(Boolean).join('\n\n'),
            value: d.value,
            tags: d.tags,
            ...(isStatus(d.status) ? { status: d.status } : {}),
            ...(isPriority(d.priority) ? { priority: d.priority } : {}),
            nextFollowUp: d.nextFollowUp ? new Date(d.nextFollowUp).toISOString() : null,
          })),
        },
      });
      onDone(keep.length);
    } catch (err) {
      setError(errorText(err));
      setBusy('');
    }
  }

  if (drafts) {
    const count = drafts.filter((d) => d.keep).length;
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">
          <Sparkles className="mr-1 inline size-3.5 text-brand-2" />
          {provider} found {drafts.length} lead{drafts.length > 1 ? 's' : ''}. Untick any you don&apos;t want.
        </p>
        <ul className="space-y-2">
          {drafts.map((d, i) => (
            <li key={i} className={`rounded-xl border p-3 transition ${d.keep ? 'border-brand/40 bg-brand/5' : 'border-line opacity-50'}`}>
              <label className="flex cursor-pointer gap-3">
                <input
                  type="checkbox"
                  className="mt-1 accent-[#c4321f]"
                  checked={d.keep}
                  onChange={() => setDrafts((cur) => cur!.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)))}
                />
                <div className="min-w-0 flex-1 space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{d.company || d.name || d.phone || 'Unnamed'}</span>
                    {isStatus(d.status) && <StatusChip status={d.status} />}
                    {isPriority(d.priority) && <PriorityDot priority={d.priority} label />}
                    {d.value > 0 && <span className="text-xs text-emerald-600">{inr(d.value)}</span>}
                  </div>
                  <p className="text-xs text-muted">{[d.company && d.name, d.email, d.phone].filter(Boolean).join(' · ')}</p>
                  {d.need && <p className="text-fg/80">{d.need}</p>}
                  {d.nextFollowUp && <p className="text-xs text-brand-3">Follow up: {formatWhen(d.nextFollowUp)}</p>}
                </div>
              </label>
            </li>
          ))}
        </ul>
        <ErrorText>{error}</ErrorText>
        <div className="grid grid-cols-[auto_1fr] gap-2 sm:flex sm:justify-between">
          <button className="btn-ghost" onClick={() => setDrafts(null)}>
            Back
          </button>
          <button className="btn-primary" disabled={!count || busy === 'save'} onClick={save}>
            <Check className="size-4" />
            {busy === 'save' ? 'Saving…' : `Save ${count} lead${count === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Paste anything — call notes, an email thread, a WhatsApp chat, a list from LinkedIn — or add a photo of a business card or notebook page.</p>
      <div className={`relative rounded-xl ${busy === 'read' ? 'ai-shimmer' : ''}`}>
        <textarea className="input min-h-40 bg-surface-2/80" value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} disabled={busy === 'read'} />
      </div>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <span key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:${img.mediaType};base64,${img.data}`} alt={img.name} className="size-16 rounded-lg object-cover ring-1 ring-line" />
              <button
                className="absolute -right-1.5 -top-1.5 rounded-full bg-surface p-0.5 ring-1 ring-line"
                onClick={() => setImages((cur) => cur.filter((_, j) => j !== i))}
                aria-label="Remove image"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <VoiceButton onText={(t) => setText((cur) => (cur ? `${cur} ${t}` : t))} />
          <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={images.length >= 4}>
            <ImagePlus className="size-4" /> Photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        </div>
        <button className="btn-primary max-sm:w-full" disabled={busy === 'read' || (!text.trim() && !images.length)} onClick={read}>
          <Sparkles className="size-4" />
          {busy === 'read' ? 'Reading…' : 'Extract leads'}
        </button>
      </div>
    </div>
  );
}
