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
  const height = 760 + visibleLogs.length * 78;

  const timeline = visibleLogs
    .map((log, index) => {
      const y = 360 + index * 78;
      const note = log.notes?.trim() ? escapeXml(log.notes.trim()) : '已上傳本月進度';
      return `
        <g transform="translate(72 ${y})">
          <circle cx="8" cy="8" r="8" fill="#B88A6A" />
          <rect x="36" y="-8" width="900" height="48" rx="24" fill="#FFFDF8" stroke="#E8DACA" stroke-width="1" />
          <text x="64" y="10" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="24" fill="#5B463A">${escapeXml(formatMonth(log.month_key))}</text>
          <text x="260" y="10" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="20" fill="#8D786B">${escapeXml(note)}</text>
        </g>
      `;
    })
    .join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="${height}" viewBox="0 0 1080 ${height}">
      <rect width="1080" height="${height}" rx="40" fill="#FBF7F1" />
      <rect x="24" y="24" width="1032" height="${height - 48}" rx="32" fill="#FFFDF8" stroke="#E8DDCF" />
      <text x="72" y="96" font-family="Noto Serif TC, Songti TC, serif" font-size="28" fill="#A28C7B" letter-spacing="5">NEATY BEAUTY</text>
      <text x="72" y="170" font-family="Noto Serif TC, Songti TC, serif" font-size="68" fill="#2F2620">鐵皮完成紀錄</text>
      <text x="72" y="228" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="28" fill="#8D786B">${escapeXml(product.name)}</text>
      <text x="72" y="272" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="22" fill="#B09898">${escapeXml(product.brand ?? 'Neaty Beauty 收藏')}</text>

      <rect x="680" y="96" width="300" height="180" rx="28" fill="#F6EEE6" stroke="#E8DDCF" />
      <text x="716" y="146" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="22" fill="#A28C7B">已記錄月數</text>
      <text x="716" y="232" font-family="Noto Serif TC, Songti TC, serif" font-size="88" fill="#8A6A52">${trackedMonths}</text>
      <text x="810" y="232" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="28" fill="#8D786B">個月</text>

      <rect x="72" y="318" width="936" height="${height - 390}" rx="28" fill="#FDF9F3" stroke="#EEE3D7" />
      <text x="112" y="400" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="24" fill="#A28C7B">開始追蹤：${escapeXml(firstMonth)}</text>
      <text x="540" y="400" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="24" fill="#A28C7B">完成日期：${escapeXml(finishedMonth)}</text>

      ${timeline}

      <text x="72" y="${height - 92}" font-family="Noto Sans TC, PingFang TC, sans-serif" font-size="24" fill="#8D786B">每一次小小進度，最後都會成為真正用完的一天。</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
