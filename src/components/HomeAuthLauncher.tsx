'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthPanel, { type AuthMode } from '@/components/AuthPanel';

export default function HomeAuthLauncher() {
  const searchParams = useSearchParams();
  const authParam = searchParams.get('auth');
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signup');

  useEffect(() => {
    if (authParam === 'login' || authParam === 'signup') {
      setMode(authParam);
      setOpen(true);
    }
  }, [authParam]);

  function openPanel(nextMode: AuthMode) {
    setMode(nextMode);
    setOpen(true);
  }

  return (
    <div className="fini-home-auth-launcher" id="auth">
      <div className="fini-home-actions">
        <button
          type="button"
          className="fini-home-primary"
          onClick={() => openPanel('signup')}
        >
          立即開始
        </button>
        <button
          type="button"
          className="fini-home-secondary"
          onClick={() => openPanel('login')}
        >
          會員登入
        </button>
      </div>

      {open && (
        <div className="fini-home-inline-auth">
          <AuthPanel compact initialMode={mode} />
        </div>
      )}
    </div>
  );
}
