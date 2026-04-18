import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInDays, format, addMonths } from 'date-fns';
import { zhHK } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compute effective expiry date:
 * - If opened + PAO exists: min(expiry_date, opened + PAO)
 * - Else: expiry_date
 */
export function getEffectiveExpiry(product: {
  expiry_date: string | null;
  opened_date: string | null;
  pao_months: number | null;
}): Date | null {
  const expiry = product.expiry_date ? new Date(product.expiry_date) : null;

  if (product.opened_date && product.pao_months != null) {
    const paoExpiry = addMonths(new Date(product.opened_date), product.pao_months);
    if (expiry && expiry < paoExpiry) return expiry;
    return paoExpiry;
  }

  return expiry;
}

/**
 * Days remaining until expiry. Negative = expired.
 */
export function getDaysUntilExpiry(product: Parameters<typeof getEffectiveExpiry>[0]): number | null {
  const expiry = getEffectiveExpiry(product);
  if (!expiry) return null;
  return differenceInDays(expiry, new Date());
}

/**
 * Status based on days remaining.
 */
export type ExpiryStatus = 'expired' | 'urgent' | 'caution' | 'ok' | 'unknown';

export function getExpiryStatus(daysUntilExpiry: number | null): ExpiryStatus {
  if (daysUntilExpiry === null) return 'unknown';
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'urgent';
  if (daysUntilExpiry <= 90) return 'caution';
  return 'ok';
}

/**
 * Human-readable days label in traditional Chinese.
 */
export function formatDaysLabel(days: number | null): string {
  if (days === null) return '未知';
  if (days < 0) return `已過期 ${Math.abs(days)} 日`;
  if (days === 0) return '今日到期';
  if (days === 1) return '仲有 1 日';
  if (days < 30) return `仲有 ${days} 日`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `仲有約 ${months} 個月`;
  }
  const years = Math.floor(days / 365);
  return `仲有約 ${years} 年`;
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'yyyy年M月d日', { locale: zhHK });
}

export const STATUS_COLORS: Record<ExpiryStatus, string> = {
  expired: 'text-status-expired bg-red-50',
  urgent: 'text-status-urgent bg-amber-50',
  caution: 'text-status-caution bg-yellow-50',
  ok: 'text-status-ok bg-green-50',
  unknown: 'text-ink-500 bg-ink-100',
};
