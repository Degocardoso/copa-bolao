import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Bolão da Copa do Mundo',
  description: 'Dê seus palpites, acompanhe o ranking e dispute o bolão da Copa.',
};

export const viewport: Viewport = {
  themeColor: '#0a1410',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
