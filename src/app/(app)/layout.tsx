import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sparkles, Home, Package, Tag, Settings } from 'lucide-react';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      {/* Top bar (desktop) */}
      <header className="hidden sm:block border-b border-ink-100 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="container-app flex items-center justify-between h-14">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-brand-500 text-white flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-display text-title text-ink-900">SOON Beauty</span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink href="/dashboard" icon={<Home className="w-4 h-4" />} label="首頁" />
            <NavLink href="/products" icon={<Package className="w-4 h-4" />} label="產品" />
            <NavLink href="/categories" icon={<Tag className="w-4 h-4" />} label="分類" />
            <NavLink href="/settings" icon={<Settings className="w-4 h-4" />} label="設定" />
          </nav>
        </div>
      </header>

      {/* Mobile header */}
      <header className="sm:hidden border-b border-ink-100 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="container-app flex items-center h-14">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-brand-500 text-white flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-display text-title text-ink-900">SOON Beauty</span>
          </Link>
        </div>
      </header>

      <main className="container-app py-6">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-ink-100 z-10">
        <div className="container-app grid grid-cols-4 h-16">
          <BottomNavLink href="/dashboard" icon={<Home className="w-5 h-5" />} label="首頁" />
          <BottomNavLink href="/products" icon={<Package className="w-5 h-5" />} label="產品" />
          <BottomNavLink href="/categories" icon={<Tag className="w-5 h-5" />} label="分類" />
          <BottomNavLink href="/settings" icon={<Settings className="w-5 h-5" />} label="設定" />
        </div>
      </nav>
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption text-ink-600 hover:text-ink-900 hover:bg-ink-100 rounded transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}

function BottomNavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center justify-center gap-0.5 text-ink-500 hover:text-brand-500 transition-colors"
    >
      {icon}
      <span className="text-micro">{label}</span>
    </Link>
  );
}
