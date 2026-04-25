import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { Home, FlaskConical, Plus, Award, CalendarDays, PawPrint } from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  featured?: boolean;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: '個人首頁', icon: <Home className="w-5 h-5" /> },
  { href: '/analyze', label: '成份分析', icon: <FlaskConical className="w-5 h-5" /> },
  { href: '/products/scan', label: '新增產品', icon: <Plus className="w-5 h-5" />, featured: true },
  { href: '/empty-bottle', label: '鐵皮計劃', icon: <Award className="w-5 h-5" /> },
  { href: '/calendar', label: '我的日曆', icon: <CalendarDays className="w-5 h-5" /> },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
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
          <nav className="fini-app-desktop-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                featured={item.featured}
              />
            ))}
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
          {navItems.map((item) =>
            item.featured ? (
              <FeaturedBottomNavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
              />
            ) : (
              <BottomNavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
              />
            )
          )}
        </div>
      </nav>
    </div>
  );
}

function NavLink({ href, label, featured }: { href: string; label: string; featured?: boolean }) {
  return (
    <Link
      href={href}
      className={`fini-app-nav-link ${featured ? 'fini-app-nav-link-featured' : ''}`}
    >
      {label}
    </Link>
  );
}

function BottomNavLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="fini-bottom-nav-link">
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function FeaturedBottomNavLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <div className="fini-bottom-nav-featured-wrap">
      <Link href={href} className="fini-bottom-nav-featured">
        {icon}
      </Link>
      <span className="fini-bottom-nav-featured-label">{label}</span>
    </div>
  );
}
