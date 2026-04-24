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
      <div className="fini-section-panel">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: '#F3E7DA', color: '#7A5E47' }}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
        </button>

        <h2 className="fini-section-title">
          {format(currentMonth, 'yyyy年 M月', { locale: zhHK })}
        </h2>

        <button
          onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ background: '#F3E7DA', color: '#7A5E47' }}
        >
          <ChevronRight style={{ width: 16, height: 16 }} />
        </button>
      </div>

      <div className="overflow-hidden rounded-[26px] border mt-4" style={{ borderColor: '#E8DDCF', background: 'linear-gradient(180deg, #fffefb 0%, #faf4ec 100%)' }}>
        <div className="grid grid-cols-7 border-b" style={{ borderColor: '#E8DDCF' }}>
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center py-2 text-micro font-medium" style={{ color: '#8D786B' }}>
              {d}
            </div>
          ))}
        </div>

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
                  borderRight: (i + 1) % 7 !== 0 ? '0.5px solid #F1E8DE' : undefined,
                  borderBottom: i < days.length - 7 ? '0.5px solid #F1E8DE' : undefined,
                  background: isSelected ? '#8A6A52' : todayDay ? '#F8F1E8' : undefined,
                  opacity: inMonth ? 1 : 0.3,
                }}
              >
                <span
                  className="text-caption font-medium"
                  style={{ color: isSelected ? 'white' : todayDay ? '#8A6A52' : '#2F2620' }}
                >
                  {format(day, 'd')}
                </span>
                {hasLog && !isSelected && (
                  <span
                    className="mt-0.5 rounded-full"
                    style={{ width: 4, height: 4, background: '#8A6A52' }}
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
      </div>

      {selectedDate && (
        <section className="space-y-3 fini-section-panel">
          <div className="flex items-center justify-between">
            <h3 className="fini-section-title" style={{ fontSize: 16 }}>
              {format(selectedDate, 'M月d日', { locale: zhHK })} 用過的產品
            </h3>
            <span className="text-micro" style={{ color: '#8D786B' }}>
              {loggedProductIds.size} / {activeProducts.length} 件
            </span>
          </div>

          {activeProducts.length === 0 ? (
            <div className="fini-empty-state p-6 text-center">
              <p className="text-caption" style={{ color: '#8D786B' }}>
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
                    className="fini-product-row w-full text-left"
                    style={{
                      background: logged ? '#EEF3EA' : undefined,
                      borderColor: logged ? '#D7E1D1' : undefined,
                      opacity: isToggling ? 0.6 : 1,
                    }}
                  >
                    {/* Thumbnail */}
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name}
                        className="flex-shrink-0 rounded-[16px] object-cover"
                        style={{ width: 44, height: 44 }} />
                    ) : (
                      <div
                        className="flex-shrink-0 rounded-[16px] flex items-center justify-center font-display"
                        style={{ width: 44, height: 44, background: '#E8E0E4', color: '#5A4050', fontSize: 16 }}
                      >
                        {p.name.slice(0, 1)}
                      </div>
                    )}

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="text-caption font-medium truncate" style={{ color: '#2F2620' }}>
                        {p.name}
                      </div>
                      <div className="text-micro truncate" style={{ color: '#8D786B' }}>
                        {p.brand ?? '—'}
                      </div>
                    </div>

                    {/* Check */}
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: logged ? '#66806A' : '#F3E7DA',
                        color: logged ? 'white' : '#B79C86',
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

      <section className="fini-section-panel p-4 space-y-2">
        <h3 style={{ fontSize: 13, fontWeight: 500, color: '#2F2620', margin: 0 }}>本月統計</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[20px] p-3" style={{ background: '#F8F1E8' }}>
            <div style={{ fontSize: 24, fontWeight: 500, color: '#8A6A52', fontFamily: "'Cormorant Garamond', serif" }}>
              {daysWithLogs.size}
            </div>
            <div className="text-micro" style={{ color: '#8A6A52', opacity: 0.75 }}>有記錄的日子</div>
          </div>
          <div className="rounded-[20px] p-3" style={{ background: '#EEF3EA' }}>
            <div style={{ fontSize: 24, fontWeight: 500, color: '#66806A', fontFamily: "'Cormorant Garamond', serif" }}>
              {logs.length}
            </div>
            <div className="text-micro" style={{ color: '#66806A', opacity: 0.75 }}>總使用記錄</div>
          </div>
        </div>
      </section>
    </div>
  );
}
