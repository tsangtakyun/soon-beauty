import Link from 'next/link';
import { Sparkles, Clock, Package, Bell } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-ink-50">
      <div className="container-app py-16 sm:py-24">
        {/* Hero */}
        <section className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-caption text-brand-600 mb-6 shadow-soft">
            <Sparkles className="w-4 h-4" />
            <span>by SOON</span>
          </div>

          <h1 className="font-display text-display-lg sm:text-[3.5rem] text-ink-900 mb-6 leading-tight">
            你屋企有幾多支
            <br />
            <span className="text-brand-500">未開封</span>嘅精華？
          </h1>

          <p className="text-body text-ink-600 max-w-xl mx-auto mb-10">
            SOON Beauty 幫你追蹤每件化妝品護膚品嘅開封日、過期日同存貨。
            唔再囤積，唔再浪費。
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login" className="btn-primary">
              免費開始使用
            </Link>
            <Link href="#features" className="btn-secondary">
              了解更多
            </Link>
          </div>

          <p className="text-micro text-ink-400 mt-4">
            免費版支援 100 件產品
          </p>
        </section>

        {/* Features */}
        <section id="features" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          <FeatureCard
            icon={<Clock className="w-5 h-5" />}
            title="精準倒數"
            description="開封日 + PAO 自動計算真實到期日，一眼睇晒邊啲要快啲用。"
          />
          <FeatureCard
            icon={<Package className="w-5 h-5" />}
            title="存貨一覽"
            description="分類 + 自訂色系，行街之前睇一睇，唔會買重複。"
          />
          <FeatureCard
            icon={<Bell className="w-5 h-5" />}
            title="溫柔提醒"
            description="就嚟過期嘅產品主動提你，唔使自己記。"
          />
          <FeatureCard
            icon={<Sparkles className="w-5 h-5" />}
            title="消耗挑戰"
            description="訂目標用完手上嘅，培養可持續嘅美容習慣。"
          />
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
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
