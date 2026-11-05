import { ImageResponse } from 'next/og';

// Home-screen icon (iOS rounds the corners itself, so this is full-bleed). Same mark as icon.svg.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#151515' }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path d="M30 14.5A8.75 8.75 0 0 0 30 32A8.75 8.75 0 0 1 30 49.5H20.5" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
          <circle cx="43" cy="14.5" r="5.5" fill="#f26b2f" />
        </svg>
      </div>
    ),
    size
  );
}
