import Image from 'next/image';
import Link from 'next/link';
import { BookHeart, Droplets, Sparkles } from 'lucide-react';

const features = [
  {
    icon: <BookHeart className="h-4 w-4" />,
    title: '產品整理',
    description: '將護膚與彩妝按分類、狀態與使用節奏妥善整理，查找更清楚。',
  },
  {
    icon: <Sparkles className="h-4 w-4" />,
    title: '色彩分析',
    description: '以更直觀的方式呈現個人色彩結果，協助你理解適合自己的色系。',
  },
  {
    icon: <Droplets className="h-4 w-4" />,
    title: '日常記錄',
    description: '記錄開封、到期與使用習慣，讓美容管理回到安靜而有序的節奏。',
  },
];

export default function HomePage() {
  return (
    <main className="fini-page">
      <nav className="fini-nav">
        <Link href="/" className="fini-logo">
          Neaty Beauty
        </Link>
        <div className="fini-nav-links">
          <Link href="#features" className="fini-nav-link">功能</Link>
          <Link href="/login" className="fini-nav-link">登入</Link>
          <Link href="/login" className="fini-nav-cta">開始使用</Link>
        </div>
      </nav>

      <section className="fini-home">
        <div className="fini-home-copy">
          <p className="fini-home-kicker">溫柔整理你的美容日常</p>
          <h1 className="fini-home-title">
            讓護膚與彩妝，
            <br />
            各自安放。
          </h1>
          <p className="fini-home-body">
            Neaty Beauty 以更柔和的方式整理產品、記錄使用習慣，並保存屬於你的色彩與美容筆記。
            它不是冰冷的工具，而是一個讓你願意慢慢打開、慢慢整理的空間。
          </p>

          <div className="fini-home-actions">
            <Link href="/login" className="fini-btn-main">立即開始</Link>
            <Link href="#features" className="fini-btn-out">了解功能</Link>
          </div>
        </div>

        <div className="fini-home-visual">
          <div className="fini-home-artboard">
            <Image
              src="/home-cat-reference.png"
              alt="Neaty Beauty 首頁主視覺"
              fill
              className="fini-home-cat-image"
              priority
            />
          </div>
        </div>
      </section>

      <section id="features" className="fini-home-features">
        {features.map((feature) => (
          <article key={feature.title} className="fini-home-feature-card">
            <div className="fini-home-feature-icon">{feature.icon}</div>
            <h2 className="fini-home-feature-title">{feature.title}</h2>
            <p className="fini-home-feature-body">{feature.description}</p>
          </article>
        ))}
      </section>

      <footer className="fini-footer">
        <p className="fini-footer-by">Neaty Beauty</p>
        <p className="fini-footer-by">柔和、自然、簡潔</p>
      </footer>
    </main>
  );
}
