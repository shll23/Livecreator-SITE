import './globals.css';
import type { Metadata } from 'next';
import HeartbeatWatcher from '@/components/HeartbeatWatcher';

export const metadata: Metadata = {
  title: 'Creator Studio · verliebdich',
  description: 'Verwalte deinen Content und deine Chats.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen antialiased">
        <HeartbeatWatcher />
        {children}
      </body>
    </html>
  );
}
