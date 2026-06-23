import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sonora — Tu universo. Tu historia. Tus datos.',
  description:
    'Sonora convierte tu música y tu gaming en estadísticas, eras, arquetipos y un resumen personal. Tu identidad digital, generada por tus datos.',
  applicationName: 'Sonora',
  openGraph: {
    title: 'Sonora — Tu universo. Tu historia. Tus datos.',
    description: 'Tu música + gaming convertidos en estadísticas, eras y tu carta de identidad digital.',
    siteName: 'Sonora',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sonora — Tu universo. Tu historia. Tus datos.',
    description: 'Tu música + gaming convertidos en estadísticas, eras y tu carta de identidad digital.',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
};

// Applies the saved accent theme before first paint (no flash of default green).
const THEME_INIT = `(function(){try{var m={sonora:['#1db954','#7c5cff','rgba(124,92,255,0.12)','rgba(29,185,84,0.10)'],cyber:['#ff2bd6','#00e5ff','rgba(255,43,214,0.16)','rgba(0,229,255,0.13)'],steam:['#66c0f4','#22d3a6','rgba(102,192,244,0.15)','rgba(34,211,166,0.10)'],midnight:['#a855f7','#6366f1','rgba(168,85,247,0.18)','rgba(99,102,241,0.12)'],rose:['#ff5d8f','#ff9472','rgba(255,93,143,0.16)','rgba(255,148,114,0.11)'],sunset:['#ff8a00','#ff2e63','rgba(255,138,0,0.15)','rgba(255,46,99,0.12)'],aqua:['#2dd4bf','#38bdf8','rgba(45,212,191,0.15)','rgba(56,189,248,0.12)'],mono:['#e5e7eb','#9ca3af','rgba(255,255,255,0.06)','rgba(148,163,184,0.05)'],aurora:['#34d399','#22d3ee','rgba(52,211,153,0.18)','rgba(34,211,238,0.13)'],inferno:['#ff6a00','#ff1e3c','rgba(255,106,0,0.18)','rgba(255,30,60,0.14)'],void:['#8b5cf6','#ec4899','rgba(139,92,246,0.20)','rgba(236,72,153,0.14)']};var c=m[localStorage.getItem('sonora-theme')];if(c){var r=document.documentElement.style;r.setProperty('--color-accent',c[0]);r.setProperty('--color-accent-2',c[1]);r.setProperty('--glow-1',c[2]);r.setProperty('--glow-2',c[3]);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
