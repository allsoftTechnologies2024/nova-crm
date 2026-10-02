'use client';

import { ArrowUp, Bot, History, Loader2, Plus, Sparkles, Square, Trash2, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, When } from '@/components/ui';
import { api, localNow } from '@/lib/client';

type Msg = { role: 'user' | 'assistant'; content: string; tools?: string[]; error?: string };
type Event =
  | { type: 'text'; text: string }
  | { type: 'tool'; name: string }
  | { type: 'saved'; conversationId: string }
  | { type: 'error'; message: string }
  | { type: 'done' };
type ChatSummary = { id: string; title: string; updatedAt: string };

interface Props {
  conversationId: string | null;
  initialMessages: Msg[];
  history: ChatSummary[];
  initialPrompt: string;
  modelLabel: string;
  canEdit: boolean;
  userName: string;
}

const TOOL_LABELS: Record<string, string> = {
  search_leads: 'Searching leads',
  get_lead: 'Reading lead',
  pipeline_summary: 'Checking pipeline',
  due_followups: 'Checking follow-ups',
  update_lead: 'Updating lead',
  create_lead: 'Creating lead',
};

const SUGGESTIONS = [
  'Plan my day: who should I call first?',
  'Which deals are stuck in proposal?',
  'Show my hot leads with the biggest value',
  'Summarise this week’s pipeline',
];

export default function Copilot({ conversationId, initialMessages, history, initialPrompt, modelLabel, canEdit, userName }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const chatId = useRef(conversationId); // set by the server's "saved" event on a new chat
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);
  useEffect(() => {
    if (initialPrompt && !started.current) {
      started.current = true;
      send(initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const patchLast = (fn: (m: Msg) => Msg) => setMessages((cur) => [...cur.slice(0, -1), fn(cur[cur.length - 1])]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setMessages([...messages, { role: 'user', content }, { role: 'assistant', content: '', tools: [] }]);
    setInput('');
    setBusy(true);
    abort.current = new AbortController();
    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ now: localNow(), conversationId: chatId.current, message: content }),
        signal: abort.current.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Copilot is unavailable.');
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const e = JSON.parse(line) as Event;
          if (e.type === 'text') patchLast((m) => ({ ...m, content: m.content + e.text }));
          else if (e.type === 'tool') patchLast((m) => ({ ...m, tools: [...(m.tools ?? []), e.name] }));
          else if (e.type === 'error') patchLast((m) => ({ ...m, error: e.message }));
          else if (e.type === 'saved' && e.conversationId !== chatId.current) {
            chatId.current = e.conversationId;
            window.history.replaceState(null, '', `/app/copilot?c=${e.conversationId}`);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') patchLast((m) => ({ ...m, error: (err as Error).message }));
    } finally {
      setBusy(false);
      abort.current = null;
      router.refresh(); // AI credit meter, chat list, and any leads the Copilot changed
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this chat?')) return;
    await api(`/api/ai/conversations/${id}`, { method: 'DELETE' }).catch(() => {});
    if (id === chatId.current) router.push('/app/copilot');
    router.refresh();
  }

  const chatList = (
    <div className="flex min-h-0 flex-col">
      <Link href="/app/copilot" className="btn-ghost mb-3 w-full" onClick={() => setShowHistory(false)}>
        <Plus className="size-4" /> New chat
      </Link>
      <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted">History</p>
      {history.length === 0 ? (
        <p className="px-1 text-xs text-muted">Your chats will appear here.</p>
      ) : (
        <ul className="scroll-thin -mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1">
          {history.map((c) => (
            <li key={c.id} className="group relative">
              <Link
                href={`/app/copilot?c=${c.id}`}
                onClick={() => setShowHistory(false)}
                className={`flex flex-col rounded-xl px-3 py-2.5 pr-9 text-sm transition lg:rounded-lg lg:px-2.5 lg:py-2 lg:pr-8 ${
                  c.id === chatId.current ? 'bg-brand text-white shadow-float [&_span]:text-white/75' : 'text-fg/80 hover:bg-surface'
                }`}
              >
                <span className="truncate">{c.title}</span>
                <When value={c.updatedAt} ago />
              </Link>
              <button
                onClick={() => remove(c.id)}
                className="absolute right-1.5 top-2 rounded p-1.5 text-muted transition hover:text-rose-600 group-hover:opacity-100 focus:opacity-100 lg:p-1 lg:opacity-0"
                aria-label="Delete chat"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    // Fills the space between the sticky header and the mobile tab bar so only the messages scroll.
    <div className="flex h-[calc(100dvh-12.25rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] gap-6 sm:h-[calc(100dvh-13.5rem)] lg:h-[calc(100dvh-9.5rem)]">
      <aside className="hidden w-64 shrink-0 flex-col rounded-3xl bg-surface-2 p-4 lg:flex">{chatList}</aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
          <div className="min-w-0">
            <h1 className="sr-only">Copilot</h1>
            <p className="line-clamp-2 text-xs font-medium text-muted sm:text-sm">
              Ask about your pipeline{canEdit ? ', or tell it to update leads' : ''}. {modelLabel && <span className="text-brand-3">Powered by {modelLabel}</span>}
            </p>
          </div>
          <div className="flex shrink-0 gap-2 lg:hidden">
            <button className="btn-ghost px-3 text-xs" onClick={() => setShowHistory(true)} aria-expanded={showHistory}>
              <History className="size-4" /> Chats
            </button>
            {messages.length > 0 && !busy && (
              <Link href="/app/copilot" className="btn-ghost px-3 text-xs" aria-label="New chat">
                <Plus className="size-4" />
              </Link>
            )}
          </div>
        </div>
        <Modal open={showHistory} onClose={() => setShowHistory(false)} title="Chats">
          <div className="flex max-h-[65dvh] flex-col">{chatList}</div>
        </Modal>

        <div className="scroll-thin flex-1 space-y-5 overflow-y-auto overscroll-contain pb-4">
          {messages.length === 0 && (
            <div className="grid h-full place-items-center">
              <div className="text-center">
                <div className="icon-tile mx-auto mb-4 size-16">
                  <Bot className="size-7 text-white" />
                </div>
                <p className="text-lg font-medium">Hi {userName}, what should we work on?</p>
                <div className="mt-5 grid gap-2 px-1 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="press rounded-2xl bg-surface px-4 py-3 text-left text-sm font-medium shadow-soft transition hover:-translate-y-0.5 hover:text-brand">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-brand px-4 py-2.5 text-sm text-white shadow-float">{m.content}</p>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-brand shadow-float">
                  <Sparkles className="size-3.5 text-white" />
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  {m.tools && m.tools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.tools.map((t, j) => (
                        <span key={j} className="chip bg-brand-3/10 text-brand-3 ring-brand-3/20">
                          <Wrench className="size-3" /> {TOOL_LABELS[t] ?? t}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.content ? (
                    <div className="space-y-2 text-sm leading-relaxed text-fg/90">{renderMarkdown(m.content)}</div>
                  ) : (
                    busy && i === messages.length - 1 && !m.error && (
                      <p className="flex items-center gap-2 text-sm text-muted">
                        <Loader2 className="size-4 animate-spin" /> Thinking…
                      </p>
                    )
                  )}
                  {m.error && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{m.error}</p>}
                </div>
              </div>
            )
          )}
          <div ref={bottom} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 rounded-3xl bg-surface p-2 shadow-soft ring-1 ring-line"
        >
          <textarea
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-base outline-none placeholder:truncate placeholder:text-muted/60 sm:text-sm"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={canEdit ? 'e.g. "Move Mehta Logistics to proposal and remind me Friday 11am"' : 'Ask about your pipeline…'}
          />
          {busy ? (
            <button type="button" className="btn-ghost size-10 rounded-full p-0 sm:size-9 sm:rounded-2xl" onClick={() => abort.current?.abort()} aria-label="Stop">
              <Square className="size-3.5" />
            </button>
          ) : (
            <button className="btn-primary size-10 rounded-full p-0 sm:size-9 sm:rounded-2xl" disabled={!input.trim()} aria-label="Send">
              <ArrowUp className="size-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// Tiny, safe markdown: paragraphs, "- " bullets, numbered lists, **bold**, `code`. No HTML injection.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-fg">
        {part.slice(2, -2)}
      </strong>
    ) : part.startsWith('`') && part.endsWith('`') ? (
      <code key={i} className="rounded bg-surface shadow-sm px-1 text-[0.85em]">
        {part.slice(1, -1)}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

function renderMarkdown(md: string) {
  return md
    .trim()
    .split(/\n{2,}/)
    .map((block, i) => {
      const lines = block.split('\n');
      if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l))) {
        const ordered = /^\s*\d+\./.test(lines[0]);
        const Tag = ordered ? 'ol' : 'ul';
        return (
          <Tag key={i} className={`space-y-1 pl-5 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-muted`}>
            {lines.map((l, j) => (
              <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ''))}</li>
            ))}
          </Tag>
        );
      }
      const heading = /^#{1,4}\s+(.*)/.exec(block);
      if (heading) return <p key={i} className="font-semibold text-fg">{inline(heading[1])}</p>;
      return (
        <p key={i} className="whitespace-pre-wrap">
          {inline(block)}
        </p>
      );
    });
}
