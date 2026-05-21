import './globals.css';
import type { Viewport, Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import BottomTabBar from '@/components/BottomTabBar';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

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

export const metadata: Metadata = {
  title: 'verliebdich · Chat mit echten Frauen',
  description: 'Diskret und persönlich. Echte Frauen in deiner Nähe.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'verliebdich',
  },
  icons: {
    icon: [
      { url: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/pwa/icon-192.png',
  },
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
  themeColor: '#ec4899',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">
        <ServiceWorkerRegister />
        {children}
        <BottomTabBar />
      </body>
    </html>
  );
}
