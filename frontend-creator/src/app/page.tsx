'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (token) router.replace('/dashboard');
    else router.replace('/login');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-zinc-500">Lade…</div>
    </div>
  );
}
