import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sonora — tu vida musical, en datos',
  description: 'Spotify Wrapped permanente + analytics + diario musical inteligente.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
