'use client';

import { type ReactNode } from 'react';
import { LiveRegionProvider, SkipLink } from '@/lib/accessibility';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <LiveRegionProvider>
      {/* Skip Links for keyboard navigation */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>

      {children}
    </LiveRegionProvider>
  );
}
