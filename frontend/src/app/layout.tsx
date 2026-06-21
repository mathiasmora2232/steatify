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
const THEME_INIT = `(function(){try{var m={sonora:['#1db954','#7c5cff'],cyber:['#ff2bd6','#00e5ff'],steam:['#66c0f4','#1b9e8f'],midnight:['#a855f7','#6366f1'],rose:['#ff5d8f','#ff9472'],sunset:['#ff8a00','#ff2e63'],aqua:['#2dd4bf','#38bdf8']};var c=m[localStorage.getItem('sonora-theme')];if(c){var r=document.documentElement;r.style.setProperty('--color-accent',c[0]);r.style.setProperty('--color-accent-2',c[1]);}}catch(e){}})();`;

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
