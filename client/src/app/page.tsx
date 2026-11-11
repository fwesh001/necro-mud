'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { CrtBezel } from './components/CrtBezel';
import { BootSequence } from './components/BootSequence';

// XTerm.js MUST be loaded client-side only — SSR will throw `window is not defined`
const Terminal = dynamic(
  () => import('./components/Terminal').then(mod => ({ default: mod.Terminal })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full text-crt-green/50 font-mono text-sm">
        Loading terminal...
      </div>
    ),
  },
);

export default function HomePage() {
  const [bootComplete, setBootComplete] = useState(false);

  return (
    <main className="flex items-center justify-center min-h-screen bg-black p-4">
      <CrtBezel>
        {!bootComplete ? (
          <BootSequence onComplete={() => setBootComplete(true)} />
        ) : (
          <Terminal wsUrl="ws://localhost:4000" />
        )}
      </CrtBezel>
    </main>
  );
}

