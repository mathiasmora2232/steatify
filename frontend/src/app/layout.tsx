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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
