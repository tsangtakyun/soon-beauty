import Image from 'next/image';
import Link from 'next/link';
import { BookHeart, Droplets, Sparkles } from 'lucide-react';

const highlights = [
  {
    icon: BookHeart,
    title: '產品整理',
    description: '將護膚與彩妝分門別類，清楚記下開封、存放與使用節奏。',
  },
  {
    icon: Sparkles,
    title: '膚色分析',
    description: '以更一致的方式保存你的色彩紀錄，讓選色建議更易回看。',
  },
  {
    icon: Droplets,
    title: '日常記錄',
    description: '把慣常使用、即將用盡與空瓶資訊，安靜地放回同一個地方。',
  },
];

export default function HomePage() {
  return (
    <main className="fini-page">
      <nav className="fini-nav">
        <Link className="fini-logo fini-logo-with-mark" href="/">
          <span className="fini-logo-mark">
            <Image
              src="/brand/cat-head.png"
              alt="Neaty Beauty 品牌貓咪圖示"
              fill
              sizes="40px"
            />
          </span>
          <span>Neaty Beauty</span>
        </Link>

        <div className="fini-nav-links">
          <a className="fini-nav-link" href="#features">
            功能
          </a>
          <Link className="fini-nav-link" href="/login">
            登入
          </Link>
          <Link className="fini-nav-cta" href="/login">
            開始使用
          </Link>
        </div>
      </nav>

      <section className="fini-home">
        <div className="fini-home-copy">
          <p className="fini-home-kicker">安靜整理你的美容日常</p>
          <h1 className="fini-home-title">
            讓護膚與彩妝，
            <br />
            各自安放。
          </h1>
          <p className="fini-home-body">
            Neaty Beauty
            以溫柔而清楚的方式，整理護膚、彩妝與個人色彩紀錄，讓你每次回來，都能輕鬆找到合適的位置。
          </p>

          <div className="fini-home-actions">
            <Link className="fini-nav-cta" href="/login">
              立即開始
            </Link>
            <a className="fini-home-secondary" href="#features">
              了解功能
            </a>
          </div>
        </div>

        <div className="fini-home-visual">
          <div className="fini-home-artboard">
            <span className="fini-home-doodle fini-home-doodle-paw">
              <Image src="/brand/paw-doodle.png" alt="" fill sizes="72px" />
            </span>
            <span className="fini-home-doodle fini-home-doodle-heart">
              <Image src="/brand/heart-doodle.png" alt="" fill sizes="48px" />
            </span>

            <div className="fini-home-scene">
              <div className="fini-home-cat-asset">
                <Image
                  src="/brand/cat-sit-hero.png"
                  alt="坐在木架上的手繪貓咪插畫"
                  fill
                  sizes="(max-width: 900px) 280px, 420px"
                  className="fini-home-object"
                />
              </div>

              <div className="fini-home-shelf-asset">
                <Image
                  src="/brand/wood-shelf-hero.png"
                  alt=""
                  fill
                  sizes="(max-width: 900px) 360px, 520px"
                  className="fini-home-object"
                />
              </div>

              <div className="fini-home-vase-asset">
                <Image
                  src="/brand/glass-vase.png"
                  alt="玻璃花瓶插畫"
                  fill
                  sizes="120px"
                  className="fini-home-object"
                />
              </div>

              <div className="fini-home-serum-asset">
                <Image
                  src="/brand/serum-bottle.png"
                  alt="精華瓶插畫"
                  fill
                  sizes="110px"
                  className="fini-home-object"
                />
              </div>

              <div className="fini-home-jar-asset">
                <Image
                  src="/brand/cream-jar.png"
                  alt="面霜罐插畫"
                  fill
                  sizes="110px"
                  className="fini-home-object"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="fini-home-features" id="features">
        {highlights.map(({ icon: Icon, title, description }) => (
          <article className="fini-home-feature-card" key={title}>
            <span className="fini-home-feature-icon">
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <h2 className="fini-home-feature-title">{title}</h2>
            <p className="fini-home-feature-body">{description}</p>
          </article>
        ))}
      </section>

      <footer className="fini-footer">
        <p>Neaty Beauty</p>
        <p className="fini-footer-by">
          以柔和而清楚的方式，
          <span>整理你的美容日常。</span>
        </p>
      </footer>
    </main>
  );
}
