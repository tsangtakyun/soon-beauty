'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';

export default function SettingsActions() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className="btn-secondary w-full" style={{ borderColor: '#E7D8CA', color: '#6E594B' }}>
      <LogOut className="w-4 h-4 mr-2" />
      登出
    </button>
  );
}
