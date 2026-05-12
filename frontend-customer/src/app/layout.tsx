import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LiveCreator',
  description: 'Verbinde dich mit deinen Lieblings-Creators',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
