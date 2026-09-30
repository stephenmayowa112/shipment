import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ShipTrack | Nigeria <-> US Cross-Border Batch Shipping Tracker',
  description: 'Logistics batch tracking platform for Nigeria and US routes with automated WhatsApp notifications, batch milestone updates, and self-service customer tracking.',
  openGraph: {
    title: 'ShipTrack | Nigeria <-> US Cross-Border Batch Shipping Tracker',
    description: 'Logistics batch tracking platform for Nigeria and US routes with automated WhatsApp notifications, batch milestone updates, and self-service customer tracking.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ShipTrack | Nigeria <-> US Cross-Border Batch Shipping Tracker',
    description: 'Logistics batch tracking platform for Nigeria and US routes with automated WhatsApp notifications, batch milestone updates, and self-service customer tracking.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
