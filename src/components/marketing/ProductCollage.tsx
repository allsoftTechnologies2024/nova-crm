import { Bot, Sparkles, Trophy, Users } from 'lucide-react';
import { ScoreRing } from '@/components/ui';

// Decorative preview of the app (overview chart, won tile, lead card, Copilot) used on the
// landing hero and auth screens. Static markup only.
export default function ProductCollage({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative mx-auto w-full ${compact ? 'max-w-md' : 'max-w-xl'}`} aria-hidden>
      {/* Overview card */}
      <div className="panel-brand relative overflow-hidden p-5">
        <div className="flex items-center justify-between">
          <p className="font-bold">Overview</p>
          <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-brand">Leads</span>
        </div>
        <svg viewBox="0 0 300 90" className="mt-3 h-24 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pc-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.25" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 70 C 30 70, 40 30, 70 35 S 110 75, 140 60 S 190 20, 220 30 S 270 70, 300 40 L300 90 L0 90Z" fill="url(#pc-fill)" />
          <path d="M0 55 C 30 45, 45 75, 75 65 S 120 15, 150 30 S 200 70, 230 50 S 275 10, 300 20" fill="none" stroke="#f5a3bd" strokeWidth="3" strokeLinecap="round" />
          <circle cx="230" cy="50" r="6" fill="#ec7c9e" stroke="#fff" strokeWidth="3" />
        </svg>
        <div className="mt-2 grid grid-cols-3 text-center text-[11px]">
          <div>
            <p className="text-white/60">Pipeline</p>
            <p className="text-base font-bold">₹31.2L</p>
          </div>
          <div className="rounded-2xl bg-white/12 py-1 ring-1 ring-white/15">
            <p className="text-white/70">New leads</p>
            <p className="text-base font-bold">24</p>
          </div>
          <div>
            <p className="text-white/60">Won</p>
            <p className="text-base font-bold">₹23.2L</p>
          </div>
        </div>
      </div>

      {/* Won tile */}
      <div className="panel-pink absolute -right-4 -top-8 hidden w-40 rotate-3 p-4 sm:block">
        <span className="grid size-10 place-items-center rounded-xl bg-white/20">
          <Trophy className="size-5" />
        </span>
        <p className="mt-3 text-xs text-white/80">Won this month</p>
        <p className="text-2xl font-bold">₹6.4L</p>
      </div>

      {/* Lead card with AI score */}
      <div className="card relative -mt-6 ml-6 w-64 -rotate-2 p-4 sm:ml-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Mehta Logistics</p>
            <p className="text-xs text-muted">Rahul Mehta · Expo</p>
          </div>
          <ScoreRing score={82} size={40} />
        </div>
        <div className="mt-3 flex gap-1.5">
          <span className="chip bg-violet-500/10 text-violet-600 ring-violet-500/20">Proposal</span>
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">₹3.5L</span>
        </div>
      </div>

      {/* Copilot bubble */}
      <div className="card absolute -bottom-6 right-0 hidden w-60 p-3.5 sm:block">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
          <Bot className="size-3.5 text-brand" /> Copilot
        </p>
        <p className="mt-1.5 text-xs leading-relaxed">
          Call <b>Mehta Logistics</b> first — hot lead, proposal due Friday. I moved it to <b>Proposal</b> ✓
        </p>
      </div>

      {/* Floating badges */}
      <span className="icon-tile absolute -left-5 top-1/2 hidden size-12 -rotate-6 sm:grid">
        <Sparkles className="size-5" />
      </span>
      {!compact && (
        <span className="absolute -left-2 -top-5 hidden items-center gap-2 rounded-2xl bg-surface px-3 py-2 text-xs font-semibold shadow-soft sm:flex">
          <Users className="size-4 text-brand" /> 6 teammates online
        </span>
      )}
    </div>
  );
}
