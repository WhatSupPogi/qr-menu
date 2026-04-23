import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'QR Menu Platform',
  description: 'Fast multi-tenant QR menu platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
