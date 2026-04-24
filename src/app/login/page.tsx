'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError(null);
    const supabase = createClient();

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(translateError(error.message)); setStatus('error'); }
      else { router.push('/dashboard'); router.refresh(); }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) { setError(translateError(error.message)); setStatus('error'); }
      else {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) { setError('帳戶建立成功！請登入。'); setMode('login'); setStatus('idle'); }
        else { router.push('/dashboard'); router.refresh(); }
      }
    }
  }

  function translateError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return '電郵或密碼錯誤';
    if (msg.includes('Email not confirmed')) return '請先確認電郵';
    if (msg.includes('User already registered')) return '此電郵已註冊，請直接登入';
    if (msg.includes('Password should be at least')) return '密碼最少 6 個字符';
    if (msg.includes('rate limit')) return '嘗試次數過多，請稍後再試';
    return msg;
  }

  return (
    <main className="fini-login-page">

      {/* Left — form */}
      <div className="fini-login-left">

        {/* Logo */}
        <Link href="/" className="fini-login-logo">
          Neaty Beauty <span>paw</span>
        </Link>

        <div className="fini-login-form-wrap">
          {/* Heading */}
          <div className="fini-login-heading">
            <h1 className="fini-login-title">
              {mode === 'login' ? '歡迎回來' : '建立帳戶'}
            </h1>
            <p className="fini-login-sub">
              {mode === 'login'
                ? '登入你嘅 gentle beauty space'
                : '開始建立你嘅美容收藏與色彩檔案'}
            </p>
          </div>

          {/* Mode tabs */}
          <div className="fini-login-tabs">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`fini-login-tab ${mode === 'login' ? 'fini-login-tab-active' : ''}`}
            >
              登入
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`fini-login-tab ${mode === 'signup' ? 'fini-login-tab-active' : ''}`}
            >
              建立帳戶
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="fini-login-form">
            <div className="fini-field">
              <label htmlFor="email" className="fini-field-label">電郵地址</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="fini-field-input"
                placeholder="your@email.com"
                autoComplete="email"
                disabled={status === 'loading'}
              />
            </div>

            <div className="fini-field">
              <label htmlFor="password" className="fini-field-label">密碼</label>
              <div className="fini-field-pw-wrap">
                <input
                  id="password"
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
                  {showPassword
                    ? <EyeOff style={{ width: 15, height: 15 }} />
                    : <Eye style={{ width: 15, height: 15 }} />
                  }
                </button>
              </div>
            </div>

            {error && (
              <div className="fini-login-error">{error}</div>
            )}

            <button
              type="submit"
              className="fini-login-submit"
              disabled={status === 'loading' || !email || !password}
            >
              {status === 'loading'
                ? '處理中...'
                : mode === 'login' ? '登入' : '建立帳戶'}
            </button>
          </form>

          {/* Back link */}
          <Link href="/" className="fini-login-back">
            ← 返回首頁
          </Link>
        </div>

        {/* Footer */}
        <p className="fini-login-footer">Neaty Beauty · soft / warm / natural</p>
      </div>

      {/* Right — image */}
      <div className="fini-login-right">
        <Image
          src="/hero.jpg"
          alt="化妝品"
          fill
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          priority
        />
        {/* Overlay quote */}
        <div className="fini-login-quote">
          <p className="fini-login-quote-text">
            Take time to make your soul happy.
          </p>
        </div>
      </div>

    </main>
  );
}
