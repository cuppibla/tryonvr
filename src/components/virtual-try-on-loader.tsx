"use client";

import dynamic from 'next/dynamic';

const VirtualTryOnClient = dynamic(() => import('@/components/virtual-try-on-client'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center">
      <p className="text-lg">Loading Virtual Try-On...</p>
    </div>
  ),
});

export default function VirtualTryOnLoader() {
  return <VirtualTryOnClient />;
}
