import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Award, Plus, Trophy, TrendingUp } from 'lucide-react';
import EmptyBottleClient from '@/components/EmptyBottleClient';
import type { Product } from '@/types/database';

const MILESTONES = [1, 5, 10, 25, 50, 100];

function getMilestone(count: number) {
  const next = MILESTONES.find((m) => m > count);
  const achieved = MILESTONES.filter((m) => m <= count);
  const latest = achieved[achieved.length - 1] ?? null;
  return { next, latest };
}

export default async function EmptyBottlePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Finished bottles
  const { data: finished } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'finished')
    .order('updated_at', { ascending: false });

  const bottles = (finished as Product[] | null) ?? [];

  // This month's bottles
  const now = new Date();
  const thisMonth = bottles.filter((p) => {
    const d = new Date(p.updated_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // Monthly savings
  const thisMonthSavings = thisMonth.reduce((sum, p) => sum + (p.price ?? 0), 0);
  const totalSavings = bottles.reduce((sum, p) => sum + (p.price ?? 0), 0);

  // Active products (for watchlist picker)
  const { data: inUse } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['in_use', 'unopened'])
    .order('name');
  const allActive = (inUse as Product[] | null) ?? [];

  // Milestone
  const { next: nextMilestone, latest: latestMilestone } = getMilestone(bottles.length);
  const progressPct = nextMilestone
    ? Math.round(((bottles.length - (latestMilestone ?? 0)) / (nextMilestone - (latestMilestone ?? 0))) * 100)
    : 100;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="fini-dash-title flex items-center gap-2">
            <Award style={{ width: 26, height: 26, color: '#B06070' }} />
            鐵皮計劃
          </h1>
          <p className="fini-dash-sub mt-1">每一支用完，都係一個小成就。</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md p-4" style={{ background: '#F0EAF4', border: '0.5px solid #D8C8E8' }}>
          <div style={{ fontSize: 32, color: '#7A5090', fontWeight: 500, fontFamily: "'Cormorant Garamond', serif" }}>
            {bottles.length}
          </div>
          <div className="text-micro" style={{ color: '#7A5090', opacity: 0.75 }}>累計交鐵皮</div>
        </div>
        <div className="rounded-md p-4" style={{ background: '#FDF0E8', border: '0.5px solid #F0D4B8' }}>
          <div style={{ fontSize: 32, color: '#C06030', fontWeight: 500, fontFamily: "'Cormorant Garamond', serif" }}>
            {thisMonth.length}
          </div>
          <div className="text-micro" style={{ color: '#C06030', opacity: 0.75 }}>本月交鐵皮</div>
        </div>
      </div>

      {/* Savings */}
      {totalSavings > 0 && (
        <div className="card p-4 flex items-center gap-3">
          <TrendingUp style={{ width: 20, height: 20, color: '#2E7A4A', flexShrink: 0 }} />
          <div className="flex-1">
            <div className="text-caption font-medium" style={{ color: '#1A1218' }}>
              本月節省 HK${thisMonthSavings.toFixed(0)}
              <span className="text-micro font-normal ml-2" style={{ color: '#9A7080' }}>
                累計 HK${totalSavings.toFixed(0)}
              </span>
            </div>
            <div className="text-micro" style={{ color: '#9A7080' }}>根據產品購買價格計算</div>
          </div>
        </div>
      )}

      {/* Milestone progress */}
      {nextMilestone && (
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy style={{ width: 16, height: 16, color: '#C0901A' }} />
              <span className="text-caption font-medium" style={{ color: '#1A1218' }}>
                下一個里程碑：{nextMilestone} 支
              </span>
            </div>
            <span className="text-micro" style={{ color: '#9A7080' }}>
              {bottles.length} / {nextMilestone}
            </span>
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: 6, background: '#F0E4E8' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: '#B06070' }}
            />
          </div>
          <div className="text-micro" style={{ color: '#9A7080' }}>
            再用完 {nextMilestone - bottles.length} 件就達到里程碑！
          </div>
        </div>
      )}
      {!nextMilestone && bottles.length >= 100 && (
        <div className="card p-4 text-center">
          <Trophy style={{ width: 32, height: 32, color: '#C0901A', margin: '0 auto 8px' }} />
          <div className="text-body font-medium" style={{ color: '#1A1218' }}>已達成所有里程碑！🎉</div>
          <div className="text-caption" style={{ color: '#9A7080' }}>你係真正嘅鐵皮達人</div>
        </div>
      )}

      {/* Watchlist — interactive client component */}
      <EmptyBottleClient
        allActive={allActive}
        thisMonth={thisMonth}
        thisMonthSavings={thisMonthSavings}
        monthLabel={`${now.getFullYear()}年${now.getMonth() + 1}月`}
      />

      {/* Finished bottles list */}
      {bottles.length > 0 && (
        <section className="space-y-3">
          <h2 className="fini-section-title">我的鐵皮記錄</h2>
          <div className="space-y-2">
            {bottles.map((p) => (
              <BottleRow key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {bottles.length === 0 && (
        <div className="card p-12 text-center space-y-3">
          <Award style={{ width: 40, height: 40, color: '#C8B4BC', margin: '0 auto' }} />
          <p className="text-body" style={{ color: '#9A7080' }}>還未有鐵皮記錄</p>
          <p className="text-caption" style={{ color: '#B09898' }}>
            喺產品頁面將狀態改為「已用完」，就會在這裡出現。
          </p>
        </div>
      )}
    </div>
  );
}

function BottleRow({ product }: { product: Product }) {
  const finishedDate = new Date(product.updated_at);
  const dateStr = `${finishedDate.getFullYear()}年${finishedDate.getMonth() + 1}月`;

  return (
    <Link href={`/products/${product.id}`} className="card p-3 flex items-center gap-3 hover:shadow-float transition-shadow">
      {product.photo_url ? (
        <img src={product.photo_url} alt={product.name}
          className="flex-shrink-0 rounded object-cover" style={{ width: 44, height: 44 }} />
      ) : (
        <div className="flex-shrink-0 rounded flex items-center justify-center"
          style={{ width: 44, height: 44, background: '#E8E0E4', color: '#5A4050', fontSize: 18,
            fontFamily: "'Cormorant Garamond', serif" }}>
          {product.name.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-body font-medium truncate" style={{ color: '#1A1218' }}>{product.name}</div>
        <div className="text-micro" style={{ color: '#9A7080' }}>
          {product.brand ?? '—'}
          {product.price ? ` · HK$${product.price}` : ''}
          {` · ${dateStr}`}
        </div>
      </div>
      <div className="flex-shrink-0 text-micro px-2.5 py-1 rounded-full"
        style={{ background: '#E8F4EC', color: '#2E7A4A' }}>
        ✓ 用完
      </div>
    </Link>
  );
}
