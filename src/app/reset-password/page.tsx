'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      setStatus('error');
      setMessage('密碼最少 6 個字符。');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('兩次輸入的密碼並不相同。');
      return;
    }

    setStatus('loading');
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus('error');
      setMessage('重設連結可能已失效，請返回首頁重新申請。');
      return;
    }

    setStatus('success');
    setMessage('密碼已更新，正在返回首頁。');
    setTimeout(() => {
      router.push('/?auth=login');
      router.refresh();
    }, 1200);
  }

  return (
    <main className="fini-page">
      <section className="fini-reset-page">
        <div className="fini-reset-card">
          <p className="fini-home-kicker">重設密碼</p>
          <h1 className="fini-reset-title">重新設定你的密碼</h1>
          <p className="fini-reset-body">輸入新密碼後，你就可以返回首頁重新登入帳戶。</p>

          <form className="fini-login-form" onSubmit={handleSubmit}>
            <div className="fini-field">
              <label htmlFor="reset-password" className="fini-field-label">
                新密碼
              </label>
              <input
                id="reset-password"
                type="password"
                minLength={6}
                required
                className="fini-field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="最少 6 個字符"
                disabled={status === 'loading'}
              />
            </div>

            <div className="fini-field">
              <label htmlFor="reset-password-confirm" className="fini-field-label">
                確認新密碼
              </label>
              <input
                id="reset-password-confirm"
                type="password"
                minLength={6}
                required
                className="fini-field-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次輸入新密碼"
                disabled={status === 'loading'}
              />
            </div>

            {message && (
              <div className={status === 'success' ? 'fini-auth-notice' : 'fini-login-error'}>
                {message}
              </div>
            )}

            <button
              type="submit"
              className="fini-login-submit"
              disabled={status === 'loading' || !password || !confirmPassword}
            >
              {status === 'loading' ? '更新中...' : '更新密碼'}
            </button>
          </form>

          <Link href="/?auth=login" className="fini-auth-text-link">
            返回首頁登入
          </Link>
        </div>
      </section>
    </main>
  );
}
