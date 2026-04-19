import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="fini-page">

      {/* Nav */}
      <nav className="fini-nav">
        <div className="fini-logo">FINI <sup>®</sup></div>
        <div className="fini-nav-links">
          <Link href="#features" className="fini-nav-link">功能</Link>
          <Link href="/login" className="fini-nav-cta">免費開始</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="fini-hero">

        {/* Left — copy */}
        <div className="fini-hero-left">
          <div className="fini-eyebrow">
            <span className="fini-eyebrow-dot" />
            你的 AI 美容管家
          </div>

          {/* Lama speech bubble */}
          <div className="fini-lama-bubble">
            <p>我係 Lama！已經幫你整理好你的化妝品啦～ 有幾支快過期，快啲用呀！</p>
          </div>

          <h1 className="fini-headline">
            讓 Lama 幫你<br />
            <em>管好每一支</em>
          </h1>

          <p className="fini-subline">
            拍照即記錄，AI 追蹤開封日、到期日、成份衝突。<br />
            不再囤積，不再浪費。
          </p>

          <div className="fini-cta-row">
            <Link href="/login" className="fini-btn-main">免費開始使用</Link>
            <Link href="#features" className="fini-btn-out">了解更多</Link>
          </div>
          <p className="fini-quota">免費版支援 100 件產品</p>
        </div>

        {/* Right — Lama */}
        <div className="fini-hero-right fini-lama-bg">
          <div className="fini-lama-wrap">
            <Image
              src="/lama.svg"
              alt="Lama — Fini的貓咪美容管家"
              width={300}
              height={395}
              priority
            />
          </div>

          {/* Floating product card */}
          <div className="fini-product-card">
            <div className="fini-card-swatch">
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
          desc="三大類整理，外出前一覽"
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="#B06070" strokeWidth="1"/>
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
          title="鐵皮計劃"
          desc="記錄每一支用完的成就"
          icon={
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2l1.5 3 3.5.5-2.5 2.5.5 3.5L7 10l-3 1.5.5-3.5L2 5.5 5.5 5Z" stroke="#B06070" strokeWidth="1" strokeLinejoin="round"/>
            </svg>
          }
          last
        />
      </div>

      {/* Footer */}
      <footer className="fini-footer">
        <p className="fini-footer-by">by <span>SOON</span></p>
        <p className="fini-footer-by">© 2026 Fini · Lama 的美容倉庫</p>
      </footer>

    </main>
  );
}

function FeatureItem({ title, desc, icon, last = false }: {
  title: string; desc: string; icon: React.ReactNode; last?: boolean;
}) {
  return (
    <div className={`fini-feat${last ? ' fini-feat-last' : ''}`}>
      <div className="fini-feat-icon">{icon}</div>
      <p className="fini-feat-title">{title}</p>
      <p className="fini-feat-desc">{desc}</p>
    </div>
  );
}
