import type { Product, ProductPanLog } from '@/types/database';

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function formatMonth(monthKey: string) {
  const [year, month] = monthKey.split('-');
  if (!year || !month) return monthKey;
  return `${year}年${Number(month)}月`;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function createPanRecordCardDataUrl(product: Product, logs: ProductPanLog[]) {
  const sortedLogs = [...logs].sort((a, b) => a.logged_date.localeCompare(b.logged_date));
  const months = [...new Set(sortedLogs.map((log) => log.month_key))];
  const visibleLogs = sortedLogs.slice(-6);
  const firstMonth = months[0] ? formatMonth(months[0]) : '未有紀錄';
  const finishedMonth = formatDateLabel(product.updated_at);
  const trackedMonths = months.length;
  const heroImage = visibleLogs[visibleLogs.length - 1]?.photo_url ?? product.photo_url ?? null;
  const imageHref = heroImage ? escapeXml(heroImage) : null;
  const height = 980 + visibleLogs.length * 92;

  const timeline = visibleLogs
    .map((log, index) => {
      const y = 560 + index * 92;
      const note = log.notes?.trim() ? escapeXml(log.notes.trim()) : '已上傳本月進度';
      return `
        <g transform="translate(88 ${y})">
          <line x1="13" y1="-44" x2="13" y2="32" stroke="#E7D8CB" stroke-width="2" />
          <circle cx="13" cy="-6" r="10" fill="#B88A6A" />
          <rect x="42" y="-38" width="860" height="60" rx="22" fill="#FFFDF8" stroke="#E8DACA" stroke-width="1" />
          <text x="72" y="-2" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="24" fill="#5B463A">${escapeXml(formatMonth(log.month_key))}</text>
          <text x="254" y="-2" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="20" fill="#8D786B">${note}</text>
        </g>
      `;
    })
    .join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}" viewBox="0 0 1080 ${height}">
      <defs>
        <linearGradient id="paperGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFDF8" />
          <stop offset="100%" stop-color="#F7EFE6" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#D8C4B4" flood-opacity="0.24" />
        </filter>
        <clipPath id="heroClip">
          <rect x="80" y="148" width="388" height="388" rx="40" />
        </clipPath>
      </defs>
      <rect width="1080" height="${height}" rx="44" fill="#FBF7F1" />
      <rect x="24" y="24" width="1032" height="${height - 48}" rx="36" fill="url(#paperGlow)" stroke="#E8DDCF" />

      <text x="82" y="92" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="26" fill="#B39A88" letter-spacing="6">NEATY BEAUTY</text>
      <text x="82" y="126" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="18" fill="#CCB7A8" letter-spacing="3">PROJECT PAN MEMORY CARD</text>

      <rect x="80" y="148" width="388" height="388" rx="40" fill="#F1E7DE" stroke="#E8DDCF" filter="url(#softShadow)" />
      ${
        imageHref
          ? `<image href="${imageHref}" x="80" y="148" width="388" height="388" preserveAspectRatio="xMidYMid slice" clip-path="url(#heroClip)" />`
          : `<text x="274" y="352" text-anchor="middle" font-family="Noto Serif TC, Songti TC, serif" font-size="120" fill="#B9A08B">${escapeXml(product.name.slice(0, 1))}</text>`
      }

      <text x="520" y="190" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="24" fill="#B39A88" letter-spacing="5">鐵皮完成紀錄</text>
      <text x="520" y="274" font-family="Noto Serif TC, Songti TC, serif" font-size="76" fill="#2F2620">${escapeXml(product.name)}</text>
      <text x="520" y="318" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="26" fill="#8D786B">${escapeXml(product.brand ?? '我的收藏')}</text>
      <text x="520" y="368" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="26" fill="#7A6656">由 ${escapeXml(firstMonth)} 開始，於 ${escapeXml(finishedMonth)} 正式完成。</text>

      <rect x="520" y="414" width="210" height="122" rx="28" fill="#FFF8F1" stroke="#E8DDCF" />
      <text x="554" y="452" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="22" fill="#A28C7B">已記錄月數</text>
      <text x="554" y="515" font-family="Noto Serif TC, Songti TC, serif" font-size="72" fill="#8A6A52">${trackedMonths}</text>
      <text x="648" y="515" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="26" fill="#8D786B">個月</text>

      <rect x="752" y="414" width="254" height="122" rx="28" fill="#FFF8F1" stroke="#E8DDCF" />
      <text x="786" y="452" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="22" fill="#A28C7B">完成小記</text>
      <text x="786" y="492" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="24" fill="#5B463A">每月慢慢用，最後</text>
      <text x="786" y="526" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="24" fill="#5B463A">真的把它用完了。</text>

      <rect x="72" y="560" width="936" height="${height - 650}" rx="32" fill="#FDF9F3" stroke="#EEE3D7" />
      <text x="104" y="622" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="24" fill="#B39A88" letter-spacing="3">MONTHLY PROGRESS</text>
      ${timeline}
      <text x="82" y="${height - 74}" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="24" fill="#8D786B">每一次小小進度，最後都會成為真正用完的一天。</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
