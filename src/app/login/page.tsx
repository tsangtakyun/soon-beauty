'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
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
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded bg-brand-500 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-display text-title text-ink-900">SOON Beauty</span>
          </div>

          <h1 className="font-display text-heading text-ink-900 mb-2">歡迎返嚟</h1>
          <p className="text-caption text-ink-600 mb-6">
            輸入電郵，我哋會寄一條登入連結俾你 — 唔使記密碼。
          </p>

          {status === 'sent' ? (
            <div className="p-4 bg-brand-50 border border-brand-200 rounded text-caption text-brand-800">
              <p className="font-medium mb-1">電郵已寄出 ✉️</p>
              <p>請檢查 {email} 嘅收件箱（包括垃圾郵件）。</p>
            </div>
          ) : (
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
                  disabled={status === 'loading'}
                />
              </div>

              {error && (
                <p className="text-caption text-status-expired">{error}</p>
              )}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={status === 'loading' || !email}
              >
                {status === 'loading' ? '寄緊...' : '寄登入連結'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
