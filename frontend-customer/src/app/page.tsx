'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/explore');
  }, [router]);
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-zinc-500">Lade…</div>
    </div>
  );
}
