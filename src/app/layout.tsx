import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SOON Beauty — 你嘅化妝品管家',
  description: '追蹤化妝品護膚品嘅開封日、過期日同存貨，唔再囤積。',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#F27A5E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-HK">
      <body>{children}</body>
    </html>
  );
}
