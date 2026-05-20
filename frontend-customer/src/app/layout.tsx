import './globals.css';
import type { Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import BottomTabBar from '@/components/BottomTabBar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata = {
  title: 'verliebdich · Chat mit echten Frauen',
  description: 'Diskret und persönlich. Echte Frauen in deiner Nähe.',
};

// Viewport-Konfiguration für stabile Mobile-Darstellung
// - maximumScale=1 + userScalable=false verhindert Pinch-Zoom und Double-Tap-Zoom
// - viewportFit=cover füllt iPhone-Notch-Bereich (für Safe-Area-Insets)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <BottomTabBar />
      </body>
    </html>
  );
}
