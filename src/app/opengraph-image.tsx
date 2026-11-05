import { ImageResponse } from 'next/og';

// Preview card shown when a smalo.in link is shared (WhatsApp, LinkedIn, X, Slack…).
export const alt = 'Smalo — AI CRM for small sales teams';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#151515', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', borderRadius: 24, background: '#fff' }}>
            <svg width="96" height="96" viewBox="0 0 64 64">
              <path d="M30 14.5A8.75 8.75 0 0 0 30 32A8.75 8.75 0 0 1 30 49.5H20.5" fill="none" stroke="#151515" strokeWidth="9" strokeLinecap="round" />
              <circle cx="43" cy="14.5" r="5.5" fill="#f26b2f" />
            </svg>
          </div>
          <div style={{ fontSize: 56, fontWeight: 700 }}>Smalo</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }}>The AI CRM for small sales teams</div>
          <div style={{ fontSize: 34, color: '#b9b9b5' }}>Capture leads by voice, text or photo. Smalo AI handles the rest.</div>
        </div>
        <div style={{ fontSize: 30, color: '#e8735f' }}>smalo.in</div>
      </div>
    ),
    size
  );
}
