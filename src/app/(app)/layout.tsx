import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Home, Package, Settings, Award, CalendarDays, PawPrint } from 'lucide-react';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/?auth=login');

  return (
    <div className="min-h-screen pb-24 sm:pb-0" style={{ background: '#FBF7F1' }}>

      {/* Desktop top bar */}
      <header className="fini-app-header hidden sm:block">
        <div className="container-app flex items-center justify-between h-[70px]">
          <Link href="/dashboard" className="fini-app-logo">
            Neaty Beauty <span>paw</span>
          </Link>
          <nav className="flex items-center gap-2">
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
        <div className="container-app flex items-center justify-between h-16">
          <Link href="/dashboard" className="fini-app-logo">
            Neaty Beauty <span>paw</span>
          </Link>
          <div className="fini-mobile-badge">
            <PawPrint className="h-4 w-4" />
          </div>
        </div>
      </header>

      <main className="container-app py-7">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-10"
        style={{ background: 'rgba(251,247,241,0.96)', borderTop: '0.5px solid #E9DED0', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-end justify-around h-[72px] px-2">
          <BottomNavLink href="/dashboard" icon={<Home className="w-5 h-5" />}        label="首頁" />
          <BottomNavLink href="/products"  icon={<Package className="w-5 h-5" />}     label="產品" />

          {/* Central 鐵皮 button */}
          <div className="flex flex-col items-center" style={{ marginBottom: 14 }}>
            <Link href="/empty-bottle" className="flex items-center justify-center rounded-full"
              style={{ width: 54, height: 54, background: 'linear-gradient(180deg, #A67C52 0%, #8B6645 100%)', boxShadow: '0 10px 22px rgba(138,106,82,0.28)' }}>
              <Award style={{ width: 22, height: 22, color: '#FFF9F4' }} />
            </Link>
            <span className="mt-1" style={{ color: '#8A6A52', fontSize: 10 }}>鐵皮</span>
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
    <Link href={href} className="inline-flex items-center px-3.5 py-2 text-caption rounded-full transition-colors"
      style={{ color: '#6F5A4F', letterSpacing: '0.02em', background: 'rgba(255,253,249,0.8)', border: '1px solid rgba(233,223,214,0.9)' }}>
      {label}
    </Link>
  );
}

function BottomNavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-0.5 transition-colors"
      style={{ color: '#8A7365', minWidth: 48 }}>
      {icon}
      <span style={{ fontSize: 10 }}>{label}</span>
    </Link>
  );
}
