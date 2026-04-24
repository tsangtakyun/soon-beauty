import Image from 'next/image';
import Link from 'next/link';
import { BookHeart, Droplets, Sparkles } from 'lucide-react';
import AuthPanel from '@/components/AuthPanel';

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
          <a className="fini-nav-link" href="#auth">
            登入
          </a>
          <a className="fini-nav-cta" href="#auth">
            開始使用
          </a>
        </div>
      </nav>

      <section className="fini-home">
        <div className="fini-home-visual">
          <div className="fini-home-artboard">
            <Image
              src="/brand/home-hero-art.png"
              alt="Neaty Beauty 首頁主視覺插畫"
              fill
              sizes="(max-width: 900px) 100vw, 46vw"
              className="fini-home-hero-image"
              priority
            />
          </div>
        </div>

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
            <a className="fini-home-primary" href="#auth">
              立即開始
            </a>
            <a className="fini-home-secondary" href="#features">
              了解功能
            </a>
          </div>
        </div>
      </section>

      <section className="fini-home-auth" id="auth">
        <div className="fini-home-auth-copy">
          <p className="fini-home-kicker">在同一頁開始</p>
          <h2 className="fini-home-auth-title">登入、註冊，都放在這裡。</h2>
          <p className="fini-home-auth-body">
            之後未登入時，系統亦會直接帶你回到首頁處理帳戶，不再跳去獨立登入頁，流程會更簡單。
          </p>
        </div>

        <AuthPanel />
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
