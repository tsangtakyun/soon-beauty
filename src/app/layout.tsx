import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Neaty Beauty — 你嘅溫柔美容收納日常',
  description: '用更柔和、更有品牌感嘅方式管理護膚品與彩妝，記錄開封、到期與個人色彩建議。',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#f6f0e8',
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
