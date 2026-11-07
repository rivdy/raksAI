import type { Metadata, Viewport } from 'next';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import './globals.css';
import { StoreProvider } from '@/lib/store';

export const metadata: Metadata = {
  title: 'RUAIX',
  description: 'Cleanroom HVAC energy savings that QA can sign off: forecast, safety gate, e-signature and a hash-sealed audit trail.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0E2A32' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans text-[14px]"><StoreProvider>{children}</StoreProvider></body>
    </html>
  );
}
