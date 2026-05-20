import './globals.css';
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
