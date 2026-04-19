import { createClient } from '@/lib/supabase/server';
import { Award, Package } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Product } from '@/types/database';

export default async function EmptyBottlePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: finished } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'finished')
    .order('updated_at', { ascending: false });

  const bottles = (finished as Product[] | null) ?? [];

  const thisMonth = bottles.filter((p) => {
    const d = new Date(p.updated_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="fini-dash-title flex items-center gap-2">
          <Award style={{ width: 28, height: 28, color: '#B06070' }} />
          鐵皮計劃
        </h1>
        <p className="fini-dash-sub mt-1">每一支用完的產品，都是一個小成就。</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md p-4" style={{ background: '#F0EAF4', border: '0.5px solid #D8C8E8' }}>
          <div className="font-display leading-none mb-1" style={{ fontSize: 32, color: '#7A5090', fontWeight: 500 }}>
            {bottles.length}
          </div>
          <div className="text-micro" style={{ color: '#7A5090', opacity: 0.75 }}>累計交鐵皮</div>
        </div>
        <div className="rounded-md p-4" style={{ background: '#FDF0E8', border: '0.5px solid #F0D4B8' }}>
          <div className="font-display leading-none mb-1" style={{ fontSize: 32, color: '#C06030', fontWeight: 500 }}>
            {thisMonth.length}
          </div>
          <div className="text-micro" style={{ color: '#C06030', opacity: 0.75 }}>本月交鐵皮</div>
        </div>
      </div>

      {/* Bottle list */}
      {bottles.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Package style={{ width: 40, height: 40, color: '#C8B4BC', margin: '0 auto' }} />
          <p className="text-body" style={{ color: '#9A7080' }}>還未有鐵皮記錄</p>
          <p className="text-caption" style={{ color: '#B09898' }}>
            當您標記一件產品為「已用完」，就會在這裡出現。
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="fini-section-title">我的鐵皮</h2>
          <div className="space-y-2">
            {bottles.map((p) => (
              <BottleRow key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BottleRow({ product }: { product: Product }) {
  return (
    <div className="card p-3 flex items-center gap-3">
      {/* Thumbnail or initial */}
      {product.photo_url ? (
        <img
          src={product.photo_url}
          alt={product.name}
          className="flex-shrink-0 rounded object-cover"
          style={{ width: 44, height: 44 }}
        />
      ) : (
        <div
          className="flex-shrink-0 rounded flex items-center justify-center font-display"
          style={{
            width: 44, height: 44,
            background: '#E8E0E4',
            color: '#5A4050',
            fontSize: 18,
          }}
        >
          {product.name.slice(0, 1)}
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="text-body font-medium truncate" style={{ color: '#1A1218' }}>
          {product.name}
        </div>
        <div className="text-micro" style={{ color: '#9A7080' }}>
          {product.brand ?? '—'}
        </div>
      </div>

      {/* Done badge */}
      <div
        className="flex-shrink-0 text-micro px-2.5 py-1 rounded-full"
        style={{ background: '#E8F4EC', color: '#2E7A4A' }}
      >
        ✓ 用完
      </div>
    </div>
  );
}
