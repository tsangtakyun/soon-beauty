import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Home, Package, Settings, Award, CalendarDays } from 'lucide-react';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen pb-24 sm:pb-0" style={{ background: '#FAFAF8' }}>

      {/* Desktop top bar */}
      <header className="fini-app-header hidden sm:block">
        <div className="container-app flex items-center justify-between h-14">
          <Link href="/dashboard" className="fini-app-logo">FINI <sup>®</sup></Link>
          <nav className="flex items-center gap-1">
            <NavLink href="/dashboard"    label="首頁" />
            <NavLink href="/products"     label="產品" />
            <NavLink href="/calendar"     label="日曆" />
            <NavLink href="/analyze"      label="分析成份" />
            <NavLink href="/skin-tone"    label="色彩分析" />
            <NavLink href="/empty-bottle" label="鐵皮計劃" />
            <NavLink href="/settings"     label="設定" />
          </nav>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="fini-app-header sm:hidden">
        <div className="container-app flex items-center h-14">
          <Link href="/dashboard" className="fini-app-logo">FINI <sup>®</sup></Link>
        </div>
      </header>

      <main className="container-app py-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-10"
        style={{ background: '#FAFAF8', borderTop: '0.5px solid #E0D4D8' }}>
        <div className="flex items-end justify-around h-16 px-1">
          <BottomNavLink href="/dashboard" icon={<Home className="w-5 h-5" />}        label="首頁" />
          <BottomNavLink href="/products"  icon={<Package className="w-5 h-5" />}     label="產品" />

          {/* Central 鐵皮 button */}
          <div className="flex flex-col items-center" style={{ marginBottom: 12 }}>
            <Link href="/empty-bottle" className="flex items-center justify-center rounded-full"
              style={{ width: 52, height: 52, background: '#B06070', boxShadow: '0 2px 12px rgba(176,96,112,0.35)' }}>
              <Award style={{ width: 22, height: 22, color: '#FDF8F6' }} />
            </Link>
            <span className="mt-1" style={{ color: '#B06070', fontSize: 10 }}>鐵皮</span>
          </div>

          <BottomNavLink href="/calendar" icon={<CalendarDays className="w-5 h-5" />} label="日曆" />
          <BottomNavLink href="/settings" icon={<Settings className="w-5 h-5" />}     label="設定" />
        </div>
      </nav>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center px-3 py-1.5 text-caption rounded transition-colors"
      style={{ color: '#7A6068', letterSpacing: '0.04em' }}>
      {label}
    </Link>
  );
}

function BottomNavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-0.5 transition-colors"
      style={{ color: '#9A7080', minWidth: 48 }}>
      {icon}
      <span style={{ fontSize: 10 }}>{label}</span>
    </Link>
  );
}
