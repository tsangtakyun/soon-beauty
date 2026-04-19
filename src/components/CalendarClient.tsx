'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay } from 'date-fns';
import { zhHK } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import type { Product } from '@/types/database';

type Log = { id: string; product_id: string; logged_date: string };

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function CalendarClient({ products }: { products: Product[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [logs, setLogs] = useState<Log[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const monthKey = format(currentMonth, 'yyyy-MM');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/product-logs?month=${monthKey}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setLoading(false);
  }, [monthKey]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd    = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days       = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Logs for selected date
  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const todayLogs = logs.filter((l) => l.logged_date === dateStr);
  const loggedProductIds = new Set(todayLogs.map((l) => l.product_id));

  // Days with any log
  const daysWithLogs = new Set(logs.map((l) => l.logged_date));

  async function toggleLog(productId: string) {
    if (!dateStr) return;
    setToggling(productId);
    await fetch('/api/product-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, logged_date: dateStr }),
    });
    await fetchLogs();
    setToggling(null);
  }

  const activeProducts = products.filter((p) =>
    p.status === 'in_use' || p.status === 'unopened'
  );

  return (
    <div className="space-y-5">

      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: '#F0E4E8', color: '#7A5060' }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
        </button>

        <h2 className="fini-section-title">
          {format(currentMonth, 'yyyy年 M月', { locale: zhHK })}
        </h2>

        <button
          onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: '#F0E4E8', color: '#7A5060' }}
        >
          <ChevronRight style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="card overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: '#E0D4D8' }}>
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center py-2 text-micro font-medium" style={{ color: '#9A7080' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayStr   = format(day, 'yyyy-MM-dd');
            const inMonth  = isSameMonth(day, currentMonth);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const hasLog   = daysWithLogs.has(dayStr);
            const todayDay = isToday(day);

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                className="relative flex flex-col items-center py-2 transition-colors"
                style={{
                  borderRight: (i + 1) % 7 !== 0 ? '0.5px solid #F0E4E8' : undefined,
                  borderBottom: i < days.length - 7 ? '0.5px solid #F0E4E8' : undefined,
                  background: isSelected ? '#B06070' : todayDay ? '#FDF0F4' : undefined,
                  opacity: inMonth ? 1 : 0.3,
                }}
              >
                <span
                  className="text-caption font-medium"
                  style={{ color: isSelected ? 'white' : todayDay ? '#B06070' : '#1A1218' }}
                >
                  {format(day, 'd')}
                </span>
                {hasLog && !isSelected && (
                  <span
                    className="mt-0.5 rounded-full"
                    style={{ width: 4, height: 4, background: '#B06070' }}
                  />
                )}
                {isSelected && hasLog && (
                  <span
                    className="mt-0.5 rounded-full"
                    style={{ width: 4, height: 4, background: 'rgba(255,255,255,0.7)' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date product list */}
      {selectedDate && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="fini-section-title" style={{ fontSize: 16 }}>
              {format(selectedDate, 'M月d日', { locale: zhHK })} 用過的產品
            </h3>
            <span className="text-micro" style={{ color: '#9A7080' }}>
              {loggedProductIds.size} / {activeProducts.length} 件
            </span>
          </div>

          {activeProducts.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-caption" style={{ color: '#9A7080' }}>
                尚未有使用中的產品，請先新增產品。
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeProducts.map((p) => {
                const logged = loggedProductIds.has(p.id);
                const isToggling = toggling === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleLog(p.id)}
                    disabled={isToggling}
                    className="card w-full p-3 flex items-center gap-3 transition-all text-left"
                    style={{
                      background: logged ? '#F0FAF4' : undefined,
                      borderColor: logged ? '#B8DEC4' : undefined,
                      opacity: isToggling ? 0.6 : 1,
                    }}
                  >
                    {/* Thumbnail */}
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name}
                        className="flex-shrink-0 rounded object-cover"
                        style={{ width: 40, height: 40 }} />
                    ) : (
                      <div
                        className="flex-shrink-0 rounded flex items-center justify-center font-display"
                        style={{ width: 40, height: 40, background: '#E8E0E4', color: '#5A4050', fontSize: 16 }}
                      >
                        {p.name.slice(0, 1)}
                      </div>
                    )}

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="text-caption font-medium truncate" style={{ color: '#1A1218' }}>
                        {p.name}
                      </div>
                      <div className="text-micro truncate" style={{ color: '#9A7080' }}>
                        {p.brand ?? '—'}
                      </div>
                    </div>

                    {/* Check */}
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: logged ? '#2E7A4A' : '#F0E4E8',
                        color: logged ? 'white' : '#C8B4BC',
                      }}
                    >
                      {logged
                        ? <Check style={{ width: 14, height: 14 }} />
                        : <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                      }
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Monthly summary */}
      <section className="card p-4 space-y-2">
        <h3 style={{ fontSize: 13, fontWeight: 500, color: '#1A1218', margin: 0 }}>本月統計</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded p-3" style={{ background: '#F0EAF4' }}>
            <div style={{ fontSize: 24, fontWeight: 500, color: '#7A5090', fontFamily: "'Cormorant Garamond', serif" }}>
              {daysWithLogs.size}
            </div>
            <div className="text-micro" style={{ color: '#7A5090', opacity: 0.75 }}>有記錄的日子</div>
          </div>
          <div className="rounded p-3" style={{ background: '#E8F4EC' }}>
            <div style={{ fontSize: 24, fontWeight: 500, color: '#2E7A4A', fontFamily: "'Cormorant Garamond', serif" }}>
              {logs.length}
            </div>
            <div className="text-micro" style={{ color: '#2E7A4A', opacity: 0.75 }}>總使用記錄</div>
          </div>
        </div>
      </section>
    </div>
  );
}
