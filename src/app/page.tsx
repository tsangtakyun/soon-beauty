import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="fini-page">

      {/* Nav */}
      <nav className="fini-nav">
        <div className="fini-logo">
          FINI <sup>®</sup>
        </div>
        <div className="fini-nav-links">
          <Link href="#features" className="fini-nav-link">功能</Link>
          <Link href="/login" className="fini-nav-cta">免費開始</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="fini-hero">
        {/* Left */}
        <div className="fini-hero-left">
          <div className="fini-eyebrow">
            <span className="fini-eyebrow-dot" />
            AI 美容管家
          </div>

          <h1 className="fini-headline">
            又浪費了<br />
            <em>一支化妝品</em>嗎？
          </h1>

          <p className="fini-subline">
            拍照即記錄，AI 幫您看管每瓶護膚品。<br />
            開封日、到期日、成份衝突，一目了然。
          </p>

          <div className="fini-cta-row">
            <Link href="/login" className="fini-btn-main">免費開始使用</Link>
            <Link href="#features" className="fini-btn-out">了解更多</Link>
          </div>

          <p className="fini-quota">免費版支援 100 件產品</p>
        </div>

        {/* Right — hero image */}
        <div className="fini-hero-right">
          <Image
            src="/hero.jpg"
            alt="化妝品成份特寫"
            fill
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            priority
          />
          {/* Product card overlay */}
          <div className="fini-product-card">
            <div className="fini-card-swatch" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="#FDF8F6" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="fini-card-info">
              <p className="fini-card-name">Laneige 水光精華</p>
              <p className="fini-card-meta">開封 2024.09 · PAO 12M</p>
            </div>
            <div className="fini-card-pill">還剩 5 個月</div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <div id="features" className="fini-strip">
        <FeatureItem
          title="精準倒數"
          desc="PAO 自動計算實際到期日"
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="#B06070" strokeWidth="1"/>
              <path d="M7 4.5V7.5l1.5 1.5" stroke="#B06070" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          }
        />
        <FeatureItem
          title="庫存總覽"
          desc="分類色系，外出購物前一覽"
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="#B06070" strokeWidth="1"/>
              <path d="M4.5 2.5V1.5M9.5 2.5V1.5" stroke="#B06070" strokeWidth="1" strokeLinecap="round"/>
              <path d="M4 7h6M4 9h4" stroke="#B06070" strokeWidth="0.8" strokeLinecap="round"/>
            </svg>
          }
        />
        <FeatureItem
          title="成份分析"
          desc="AI 檢查相容性，助您決策"
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2C4.8 2 3 3.8 3 6c0 2.4 4 7 4 7s4-4.6 4-7c0-2.2-1.8-4-4-4z" stroke="#B06070" strokeWidth="1"/>
              <circle cx="7" cy="6" r="1.2" stroke="#B06070" strokeWidth="0.8"/>
            </svg>
          }
        />
        <FeatureItem
          title="消耗計畫"
          desc="有計畫地用完，不再囤積"
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 9l2.5-4 2 3 2.5-6L11 9" stroke="#B06070" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
          last
        />
      </div>

      {/* Footer */}
      <footer className="fini-footer">
        <p className="fini-footer-by">by <span>SOON</span></p>
        <p className="fini-footer-by">© 2026 Fini · 您的 AI 美容管家</p>
      </footer>

    </main>
  );
}

function FeatureItem({
  title,
  desc,
  icon,
  last = false,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`fini-feat${last ? ' fini-feat-last' : ''}`}>
      <div className="fini-feat-icon">{icon}</div>
      <p className="fini-feat-title">{title}</p>
      <p className="fini-feat-desc">{desc}</p>
    </div>
  );
}
