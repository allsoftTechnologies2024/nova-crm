import { ImageResponse } from 'next/og';

// Home-screen icon (iOS rounds the corners itself, so this is full-bleed). Same mark as icon.svg.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#151515' }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path d="M42 21.5C40 17.5 36.5 15.5 31.5 15.5C25.5 15.5 21 18.8 21 24C21 35 43 29 43 40C43 45.2 38.5 48.5 32 48.5C26.5 48.5 22.5 46 20.5 42" fill="none" stroke="#fff" strokeWidth="7.5" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size
  );
}
