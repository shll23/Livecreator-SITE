import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Creator Studio · verliebdich',
  description: 'Verwalte deinen Content und deine Chats.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
