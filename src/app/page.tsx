import Image from 'next/image';
import Link from 'next/link';
import {
  BookHeart,
  Droplets,
  Heart,
  NotebookPen,
  PawPrint,
  ScanSearch,
  Sparkles,
} from 'lucide-react';

const features = [
  {
    icon: <ScanSearch className="h-4 w-4" />,
    title: 'Discover',
    description: '拍照整理產品、辨識成分，慢慢建立你嘅美容收藏。',
  },
  {
    icon: <Droplets className="h-4 w-4" />,
    title: 'Skincare',
    description: '記錄開封、PAO、到期時間，同 routine 排得更清楚。',
  },
  {
    icon: <Heart className="h-4 w-4" />,
    title: 'Favorite',
    description: '收藏最啱你膚況同色彩方向嘅選擇，唔再亂買。',
  },
];

const previewCards = [
  {
    title: 'Skincare Shelf',
    body: '將 toner、serum、cream 分層整理，保留你最常用嗰幾支。',
    tone: 'cream',
  },
  {
    title: 'Color Story',
    body: '把個人色彩分析變成可視化色板，揀妝更順手。',
    tone: 'rose',
  },
  {
    title: 'Routine Notes',
    body: '早晚步驟、用後感、回購想法都放返入同一個空間。',
    tone: 'sage',
  },
];

export default function HomePage() {
  return (
    <main className="fini-page">
      <nav className="fini-nav">
        <Link href="/" className="fini-logo">
          Soon Beauty <span>paw</span>
        </Link>
        <div className="fini-nav-links">
          <Link href="#moodboard" className="fini-nav-link">風格</Link>
          <Link href="#features" className="fini-nav-link">功能</Link>
          <Link href="/login" className="fini-nav-cta">開始整理</Link>
        </div>
      </nav>

      <section className="fini-hero">
        <div className="fini-hero-left">
          <div className="fini-eyebrow">
            <PawPrint className="h-3.5 w-3.5" />
            Gentle, warm, and beautifully organized
          </div>

          <div className="fini-script-note">A gentle space for you to discover your beauty.</div>

          <h1 className="fini-headline">
            Find the best skincare
            <br />
            for your <em>beautiful self.</em>
          </h1>

          <p className="fini-subline">
            Soon Beauty 將護膚管理、色彩分析同日常筆記放入同一個柔和空間。
            唔再係冷冰冰嘅 dashboard，而係一個你真係想每日打開嘅 beauty home。
          </p>

          <div className="fini-cta-row">
            <Link href="/login" className="fini-btn-main">Explore Now</Link>
            <Link href="#features" className="fini-btn-out">See The Mood</Link>
          </div>

          <div className="fini-feature-icons">
            {features.map((feature) => (
              <div key={feature.title} className="fini-feature-icon-card">
                <div className="fini-feature-icon">{feature.icon}</div>
                <div className="fini-feature-copy">
                  <div className="fini-feature-copy-title">{feature.title}</div>
                  <div className="fini-feature-copy-desc">{feature.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="fini-hero-right">
          <div className="fini-hero-illustration">
            <div className="fini-hero-shelf" />
            <div className="fini-hero-props">
              <span className="fini-bottle fini-bottle-tall" />
              <span className="fini-bottle fini-bottle-jar" />
              <span className="fini-bottle fini-bottle-drop" />
            </div>
            <div className="fini-paw-trail">
              <span />
              <span />
              <span />
            </div>
            <Image
              src="/lama.svg"
              alt="Soon Beauty 的品牌貓咪角色"
              width={360}
              height={420}
              className="fini-hero-mascot"
              priority
            />
          </div>

          <div className="fini-product-card">
            <div className="fini-card-swatch">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="fini-card-info">
              <p className="fini-card-name">Glow Serum</p>
              <p className="fini-card-meta">Hydrate · Brighten · Morning routine</p>
            </div>
            <div className="fini-card-pill">Soft pick</div>
          </div>
        </div>
      </section>

      <section id="moodboard" className="fini-moodboard">
        <div className="fini-moodboard-card fini-brand-panel">
          <div>
            <p className="fini-section-kicker">Brand Mood</p>
            <h2 className="fini-section-title-lg">White + wood + hand-drawn cat</h2>
            <p className="fini-section-body">
              呢個方向會成為整個產品嘅新語言：柔和留白、奶油底、木色點綴、像紙本手帳一樣可親。
            </p>
          </div>

          <div className="fini-palette-row">
            {['#FFFDF9', '#F7F3EC', '#EDE2D2', '#C8A98A', '#8A6A52', '#3A2F28'].map((color) => (
              <div key={color} className="fini-palette-swatch">
                <span style={{ background: color }} />
                <small>{color}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="fini-moodboard-card fini-preview-grid">
          {previewCards.map((card) => (
            <div key={card.title} className={`fini-preview-card fini-preview-${card.tone}`}>
              <div className="fini-preview-ornament" />
              <div className="fini-preview-title">{card.title}</div>
              <p className="fini-preview-body">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="fini-strip">
        <FeatureItem
          title="Beauty Library"
          desc="產品清單、分類與空瓶紀錄會變成一個溫柔又清楚嘅收藏櫃。"
          icon={<BookHeart className="h-4 w-4" />}
        />
        <FeatureItem
          title="Color Report"
          desc="膚色分析會以雜誌式報告呈現，而唔係一堆冷資料。"
          icon={<Sparkles className="h-4 w-4" />}
        />
        <FeatureItem
          title="Routine Flow"
          desc="早晚護膚步驟、使用節奏同提醒，會更似手帳而唔係表格。"
          icon={<Droplets className="h-4 w-4" />}
        />
        <FeatureItem
          title="Notes & Favorites"
          desc="將回購、心得同最愛色系放返同一個空間，建立你自己嘅美容語言。"
          icon={<NotebookPen className="h-4 w-4" />}
          last
        />
      </section>

      <footer className="fini-footer">
        <p className="fini-footer-by">Soon Beauty · soft / warm / natural / simple</p>
        <p className="fini-footer-by">© 2026 · your beauty, gently organized</p>
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
