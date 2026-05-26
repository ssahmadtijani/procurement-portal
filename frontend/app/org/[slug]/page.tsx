'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function OrgRoot() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    router.replace(`/org/${params.slug}/dashboard`);
  }, [router, params.slug]);
  return null;
}
