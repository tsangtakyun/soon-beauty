'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, ArrowLeft, Eye, EyeOff } from 'lucide-react';

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
      if (error) {
        setError(translateError(error.message));
        setStatus('error');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(translateError(error.message));
        setStatus('error');
      } else {
        // Auto sign in after signup
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) {
          setError('帳戶建立成功！請登入。');
          setMode('login');
          setStatus('idle');
        } else {
          router.push('/dashboard');
          router.refresh();
        }
      }
    }
  }

  function translateError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return '電郵或密碼錯誤';
    if (msg.includes('Email not confirmed')) return '請先確認電郵';
    if (msg.includes('User already registered')) return '呢個電郵已經註冊過，請直接登入';
    if (msg.includes('Password should be at least')) return '密碼最少6個字符';
    if (msg.includes('rate limit')) return '試咗太多次，請稍後再試';
    return msg;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-ink-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-caption text-ink-500 hover:text-ink-800 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          返回首頁
        </Link>

        <div className="card p-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded bg-brand-500 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-display text-title text-ink-900">SOON Beauty</span>
          </div>

          {/* Mode toggle */}
          <div className="flex bg-ink-100 rounded p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-1.5 text-caption font-medium rounded transition-colors ${
                mode === 'login'
                  ? 'bg-white text-ink-900 shadow-soft'
                  : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              登入
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-1.5 text-caption font-medium rounded transition-colors ${
                mode === 'signup'
                  ? 'bg-white text-ink-900 shadow-soft'
                  : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              建立帳戶
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">電郵地址</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="your@email.com"
                autoComplete="email"
                disabled={status === 'loading'}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">密碼</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder={mode === 'signup' ? '最少6個字符' : '輸入密碼'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  disabled={status === 'loading'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-caption text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={status === 'loading' || !email || !password}
            >
              {status === 'loading'
                ? '處理緊...'
                : mode === 'login' ? '登入' : '建立帳戶'
              }
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
