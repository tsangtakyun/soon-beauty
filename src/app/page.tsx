import Link from 'next/link';
import { Sparkles, Clock, Package, Bell } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-ink-50">
      <div className="container-app py-16 sm:py-24">
        {/* 主視覺 */}
        <section className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-caption text-brand-600 mb-6 shadow-soft">
            <Sparkles className="w-4 h-4" />
            <span>by SOON</span>
          </div>

          <h1 className="font-display text-display-lg sm:text-[3.5rem] text-ink-900 mb-6 leading-tight">
            您家中還有多少瓶
            <br />
            <span className="text-brand-500">未開封</span>的精華？
          </h1>

          <p className="text-body text-ink-600 max-w-xl mx-auto mb-10">
            SOON Beauty 協助您追蹤每件化妝品護膚品的開封日期、過期日期及庫存數量。
            減少囤積，避免浪費。
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login" className="btn-primary">免費開始使用</Link>
            <Link href="#features" className="btn-secondary">了解更多</Link>
          </div>

          <p className="text-micro text-ink-400 mt-4">免費版支援 100 件產品</p>
        </section>

        {/* 功能介紹 */}
        <section id="features" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          <FeatureCard
            icon={<Clock className="w-5 h-5" />}
            title="精準倒數"
            description="根據開封日期與 PAO 自動計算實際到期日，一目了然哪些產品需要盡快使用。"
          />
          <FeatureCard
            icon={<Package className="w-5 h-5" />}
            title="庫存總覽"
            description="依分類與自訂色系整理，外出購物前查看一下，避免重複購買。"
          />
          <FeatureCard
            icon={<Bell className="w-5 h-5" />}
            title="到期提醒"
            description="即將過期的產品主動提醒您，無需自行記錄。"
          />
          <FeatureCard
            icon={<Sparkles className="w-5 h-5" />}
            title="消耗計畫"
            description="設定目標，有計畫地使用現有產品，培養可持續的美容習慣。"
          />
        </section>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card p-5">
      <div className="w-10 h-10 rounded bg-brand-100 text-brand-600 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="text-title font-medium text-ink-900 mb-1">{title}</h3>
      <p className="text-caption text-ink-600">{description}</p>
    </div>
  );
}
