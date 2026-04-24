'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'login' | 'signup';

export default function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError(null);
    setNotice(null);
    const supabase = createClient();

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(translateError(error.message));
        setStatus('error');
        return;
      }

      router.push('/dashboard');
      router.refresh();
      return;
    }

    const emailRedirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=/dashboard`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });

    if (error) {
      setError(translateError(error.message));
      setStatus('error');
      return;
    }

    if (data.session) {
      router.push('/dashboard');
      router.refresh();
      return;
    }

    setStatus('idle');
    setMode('login');
    setNotice('帳戶已建立，請先到電郵收取確認信，再返回登入。');
  }

  function translateError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return '電郵或密碼錯誤';
    if (msg.includes('Email not confirmed')) return '請先確認電郵，再登入帳戶';
    if (msg.includes('User already registered')) return '此電郵已註冊，請直接登入';
    if (msg.includes('Password should be at least')) return '密碼最少 6 個字符';
    if (msg.includes('rate limit')) return '嘗試次數過多，請稍後再試';
    return msg;
  }

  return (
    <div className="fini-auth-card">
      <div className="fini-auth-card-head">
        <p className="fini-auth-card-kicker">登入或建立帳戶</p>
        <h2 className="fini-auth-card-title">由首頁開始整理</h2>
        <p className="fini-auth-card-body">
          直接在這裡登入，或建立新帳戶後開始記錄你的護膚、彩妝與色彩資料。
        </p>
      </div>

      <div className="fini-login-tabs">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError(null);
            setNotice(null);
          }}
          className={`fini-login-tab ${mode === 'login' ? 'fini-login-tab-active' : ''}`}
        >
          登入
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setError(null);
            setNotice(null);
          }}
          className={`fini-login-tab ${mode === 'signup' ? 'fini-login-tab-active' : ''}`}
        >
          建立帳戶
        </button>
      </div>

      <form onSubmit={handleSubmit} className="fini-login-form">
        <div className="fini-field">
          <label htmlFor="home-auth-email" className="fini-field-label">
            電郵地址
          </label>
          <input
            id="home-auth-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="fini-field-input"
            placeholder="name@example.com"
            autoComplete="email"
            disabled={status === 'loading'}
          />
        </div>

        <div className="fini-field">
          <label htmlFor="home-auth-password" className="fini-field-label">
            密碼
          </label>
          <div className="fini-field-pw-wrap">
            <input
              id="home-auth-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="fini-field-input"
              placeholder={mode === 'signup' ? '最少 6 個字符' : '輸入密碼'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={status === 'loading'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="fini-pw-toggle"
              tabIndex={-1}
              aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error && <div className="fini-login-error">{error}</div>}
        {notice && <div className="fini-auth-notice">{notice}</div>}

        <button
          type="submit"
          className="fini-login-submit"
          disabled={status === 'loading' || !email || !password}
        >
          {status === 'loading'
            ? '處理中...'
            : mode === 'login'
              ? '登入'
              : '建立帳戶'}
        </button>
      </form>
    </div>
  );
}
