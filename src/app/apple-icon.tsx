import { ImageResponse } from 'next/og';

// Home-screen icon (iOS rounds the corners itself, so this is full-bleed). Same mark as icon.svg.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  const u = 180 / 64; // icon.svg is drawn on a 64-unit grid
  const box = (x: number, y: number, w: number, h: number) => ({
    position: 'absolute' as const,
    left: x * u,
    top: y * u,
    width: w * u,
    height: h * u,
    borderRadius: 2.5 * u,
    background: '#fff',
  });
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#151515' }}>
        <div style={box(19, 14, 10, 36)} />
        <div style={box(19, 40, 26, 10)} />
        <div style={{ position: 'absolute', left: 38.5 * u, top: 15.5 * u, width: 11 * u, height: 11 * u, borderRadius: '50%', background: '#c4321f' }} />
      </div>
    ),
    size
  );
}
