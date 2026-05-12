import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'verliebdich · Chat mit echten Creators',
  description: 'Triff faszinierende Persönlichkeiten und chatte privat.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
