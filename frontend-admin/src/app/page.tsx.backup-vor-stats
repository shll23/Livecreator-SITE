'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.push(getAccessToken() ? '/photos' : '/login');
  }, [router]);
  return null;
}
