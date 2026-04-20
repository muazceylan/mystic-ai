import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AstroGuru — Kisisel Astroloji ve Spirituel Rehberlik';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #0f172a 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: 16,
          }}
        >
          AstroGuru
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#c4b5fd',
            maxWidth: 700,
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          Kisisel Astroloji, Numeroloji ve Spirituel Rehberlik
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 18,
            color: '#a78bfa',
            display: 'flex',
            gap: 24,
          }}
        >
          <span>Natal Harita</span>
          <span>·</span>
          <span>Gunluk Transitler</span>
          <span>·</span>
          <span>Ruya Yorumu</span>
          <span>·</span>
          <span>Numeroloji</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
