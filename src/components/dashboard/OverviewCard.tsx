'use client';

import { useRef, useState } from 'react';
import { compactInr } from '@/lib/client';

type Month = { key: string; label: string; count: number; value: number; won: number };

const W = 640;
const H = 150;
const PAD = 26; // keeps the first/last month's point and band inside the card

// Smooth curve through points (Catmull-Rom → cubic Bézier).
function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1] ?? pts[i];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const [x3, y3] = pts[i + 2] ?? pts[i + 1];
    d += ` C ${x1 + (x2 - x0) / 6} ${y1 + (y2 - y0) / 6}, ${x2 - (x3 - x1) / 6} ${y2 - (y3 - y1) / 6}, ${x2} ${y2}`;
  }
  return d;
}

// The black "Overview" card: monthly wave chart + three headline numbers.
export default function OverviewCard({ months, openValue, wonValue }: { months: Month[]; openValue: number; wonValue: number }) {
  const [metric, setMetric] = useState<'count' | 'value'>('count');
  const [sel, setSel] = useState(months.length - 1);
  const chart = useRef<HTMLDivElement>(null);

  // Tap or drag across the chart to scrub between months (the labels are small targets on phones).
  function scrub(e: React.PointerEvent) {
    if (e.type === 'pointermove' && e.buttons === 0 && e.pointerType === 'mouse') return;
    const r = chart.current!.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - PAD) / (W - 2 * PAD)) * (months.length - 1));
    setSel(Math.max(0, Math.min(months.length - 1, i)));
  }

  const vals = months.map((m) => m[metric]);
  const max = Math.max(1, ...vals);
  const x = (i: number) => PAD + (i / (months.length - 1)) * (W - 2 * PAD);
  const y = (v: number) => H - 18 - (v / max) * (H - 48);
  const pts = vals.map((v, i) => [x(i), y(v)] as [number, number]);
  const line = smoothPath(pts);
  const secondary = smoothPath(months.map((m, i) => [x(i), y((m.won / Math.max(1, ...months.map((n) => n.won))) * max * 0.7)] as [number, number]));
  const m = months[sel];
  const fmt = (v: number) => (metric === 'count' ? `${v} lead${v === 1 ? '' : 's'}` : compactInr(v));

  return (
    <section className="panel-brand relative min-w-0 overflow-hidden p-5 pb-0 sm:p-6 sm:pb-0">
      <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex items-center justify-between">
        <h2 className="text-lg font-bold">Overview</h2>
        <div className="flex rounded-full bg-white/10 p-1 text-xs ring-1 ring-white/25">
          {(['count', 'value'] as const).map((k) => (
            <button key={k} onClick={() => setMetric(k)} className={`rounded-full px-3 py-1 font-semibold transition ${metric === k ? 'bg-white text-brand' : 'text-white/80'}`}>
              {k === 'count' ? 'Leads' : 'Value'}
            </button>
          ))}
        </div>
      </div>

      <div ref={chart} className="relative mt-3 touch-pan-y" onPointerDown={scrub} onPointerMove={scrub}>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full overflow-visible sm:h-40" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ov-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* highlighted month band */}
          <rect x={x(sel) - 22} y={0} width={44} height={H} rx={18} fill="#fff" fillOpacity={0.12} />
          <path d={`${secondary} L ${W} ${H} L 0 ${H} Z`} fill="url(#ov-fill)" />
          <path d={secondary} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <path d={line} fill="none" stroke="#ff7a63" strokeWidth={3} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {/* point + tooltip (HTML so it doesn't stretch with the SVG) */}
        <span
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-brand-2 shadow-lg"
          style={{ left: `${(x(sel) / W) * 100}%`, top: `${(pts[sel][1] / H) * 100}%` }}
        />
        <span
          className="pointer-events-none absolute -translate-y-[130%] rounded-xl bg-brand-2 px-3 py-1.5 text-xs font-bold shadow-lg"
          style={{ left: `calc(${(x(sel) / W) * 100}% + ${sel > months.length - 3 ? '-110px' : '14px'})`, top: `${(pts[sel][1] / H) * 100}%` }}
        >
          {fmt(m[metric])}
          <span className="block text-[10px] font-medium text-white/70">{m.won} won</span>
        </span>
      </div>

      <div className="relative mt-1 h-7 text-[11px] font-medium text-white/60">
        {months.map((mo, i) => (
          <button
            key={mo.key}
            onClick={() => setSel(i)}
            style={{ left: `${(x(i) / W) * 100}%` }}
            className={`absolute -translate-x-1/2 rounded-full px-2 py-1 transition ${i === sel ? 'z-10 bg-white font-bold text-brand' : `hover:text-white ${(months.length - 1 - i) % 2 ? 'max-sm:hidden' : ''}`}`}
          >
            {mo.label}
          </button>
        ))}
      </div>

      {/* Headline numbers; the middle one sits in a raised glass box like the reference */}
      <div className="relative -mx-5 mt-5 grid grid-cols-3 items-end bg-brand-dark/60 px-2 text-center sm:-mx-6 sm:px-4">
        <div className="py-5">
          <p className="text-[11px] text-white/60">Open pipeline</p>
          <p className="text-lg font-bold sm:text-2xl">{compactInr(openValue)}</p>
          <p className="text-[11px] text-white/60">Now</p>
        </div>
        <div className="-mt-6 rounded-t-3xl bg-white/12 py-5 ring-1 ring-white/15 backdrop-blur">
          <p className="text-[11px] text-white/70">Leads added</p>
          <p className="text-2xl font-bold sm:text-3xl">{m.count}</p>
          <p className="text-[11px] text-white/70">{m.label}</p>
        </div>
        <div className="py-5">
          <p className="text-[11px] text-white/60">Won revenue</p>
          <p className="text-lg font-bold sm:text-2xl">{compactInr(wonValue)}</p>
          <p className="text-[11px] text-white/60">All time</p>
        </div>
      </div>
    </section>
  );
}
