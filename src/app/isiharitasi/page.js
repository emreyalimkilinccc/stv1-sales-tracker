'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export default function IsiHaritasiPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState('week')
  const [dailyData, setDailyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, 'sales'))
        const data = snap.docs.map(d => d.data()).filter(s => s.amount)
        const now = new Date()

        const filtered = data.filter(s => {
          if (!s.date) return false
          const d = new Date(s.date)
          if (period === 'week') {
            const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
            return d >= weekAgo
          } else {
            const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1)
            return d >= monthAgo
          }
        })

        const dayTotals = Array(7).fill(0)
        const dayCounts = Array(7).fill(0)
        const dateTotals = {}
        let total = 0

        filtered.forEach(s => {
          let dayIdx = 0
          try {
            if (s.date) { const d = new Date(s.date); dayIdx = (d.getDay() + 6) % 7 }
          } catch (e) {}
          const amount = parseFloat(s.amount) || 0
          total += amount
          dayTotals[dayIdx] += amount
          dayCounts[dayIdx]++

          const dateKey = s.date ? s.date.split('T')[0] : ''
          if (dateKey) {
            if (!dateTotals[dateKey]) dateTotals[dateKey] = 0
            dateTotals[dateKey] += amount
          }
        })

        const totalDays = period === 'week' ? 7 : 30
        const maxDay = Math.max(...dayTotals)
        const bestDayIdx = dayTotals.indexOf(maxDay)
        const worstDayIdx = dayTotals.indexOf(Math.min(...dayTotals.filter(v => v > 0) || [0]))

        const sortedDates = Object.entries(dateTotals).sort((a, b) => b[1] - a[1])
        const bestDate = sortedDates[0]
        const worstDate = sortedDates[sortedDates.length - 1]

        setDailyData(DAYS_TR.map((day, i) => ({
          day, short: DAYS_SHORT[i],
          total: dayTotals[i],
          count: dayCounts[i],
          avg: dayCounts[i] > 0 ? dayTotals[i] / dayCounts[i] : 0
        })))

        setStats({
          total,
          totalSales: filtered.length,
          avgPerDay: Math.round(total / totalDays),
          bestDay: DAYS_TR[bestDayIdx],
          bestDayTotal: maxDay,
          worstDay: worstDayIdx >= 0 ? DAYS_TR[worstDayIdx] : '-',
          bestDate: bestDate ? { date: bestDate[0], total: bestDate[1] } : null,
          worstDate: worstDate ? { date: worstDate[0], total: worstDate[1] } : null,
          maxDay
        })
      } catch (e) {}
      setLoading(false)
    }
    fetchData()
  }, [user, period])

  if (!user) return null

  const formatCurrency = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #f97316 50%, #f59e0b 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.1, transform: 'rotate(15deg)' }}>🔥</div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem', position: 'relative' }}>🔥 Satış Isı Haritası</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', position: 'relative' }}>Günlük satış yoğunluğu ve trend analizi</p>
      </div>

      {/* Dönem */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        {[{ key: 'week', label: 'Son 7 Gün', icon: '📅' }, { key: 'month', label: 'Son 30 Gün', icon: '📆' }].map(p => (
          <button key={p.key} onClick={() => { setPeriod(p.key); setLoading(true) }} style={{
            flex: 1, padding: '0.875rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: '600',
            border: `2px solid ${period === p.key ? '#ef4444' : '#334155'}`,
            backgroundColor: period === p.key ? 'rgba(239,68,68,0.15)' : '#0f172a',
            color: period === p.key ? '#ef4444' : '#94a3b8', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* İstatistikler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '1rem' }}>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Toplam Satış</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', marginTop: '0.25rem' }}>{formatCurrency(stats.total || 0)}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>{stats.totalSales || 0} işlem</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Günlük Ortalama</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#06b6d4', marginTop: '0.25rem' }}>{formatCurrency(stats.avgPerDay || 0)}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>işlem ortalaması</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En Yoğun Gün</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#f59e0b', marginTop: '0.25rem' }}>{stats.bestDay || '-'}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>{formatCurrency(stats.bestDayTotal || 0)}</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En Sakin Gün</div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#8b5cf6', marginTop: '0.25rem' }}>{stats.worstDay || '-'}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>En az satış yapılan gün</div>
        </div>
      </div>

      {/* Dikey Bar Chart */}
      <div className="card" style={{ marginTop: '1rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📊</span>
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>Günlük Satış Dağılımı</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>⏳</div>
            Veriler yükleniyor...
          </div>
        ) : (
          <div style={{ padding: '1.5rem 1.25rem' }}>
            {/* Grafik */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '200px', marginBottom: '0.5rem' }}>
              {dailyData.map((d, i) => {
                const height = stats.maxDay > 0 ? (d.total / stats.maxDay) * 100 : 0
                const isBest = d.total === stats.maxDay && d.total > 0
                const intensity = stats.maxDay > 0 ? d.total / stats.maxDay : 0
                const barColor = isBest ? '#ef4444' : intensity > 0.7 ? '#f97316' : intensity > 0.4 ? '#f59e0b' : intensity > 0 ? '#10b981' : '#1e293b'

                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                    {/* Değer */}
                    <div style={{ fontSize: '10px', fontWeight: '600', color: d.total > 0 ? barColor : '#334155', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                      {d.total > 0 ? formatCurrency(d.total).replace('₺', '').trim() : ''}
                    </div>
                    {/* Bar */}
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', paddingBottom: '4px' }}>
                      <div style={{
                        width: '100%', height: `${Math.max(height, d.total > 0 ? 8 : 2)}%`,
                        backgroundColor: barColor, borderRadius: '6px 6px 4px 4px',
                        transition: 'height 0.5s ease',
                        boxShadow: isBest ? `0 0 12px ${barColor}66` : 'none',
                        position: 'relative'
                      }}>
                        {isBest && (
                          <div style={{
                            position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)',
                            fontSize: '12px', backgroundColor: '#ef4444', color: '#fff', padding: '2px 6px',
                            borderRadius: '9999px', fontSize: '9px', fontWeight: '700', whiteSpace: 'nowrap'
                          }}>
                            EN YOĞUN
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Gün İsimleri */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {dailyData.map((d, i) => {
                const isBest = d.total === stats.maxDay && d.total > 0
                return (
                  <div key={i} style={{
                    flex: 1, textAlign: 'center', fontSize: '12px', fontWeight: isBest ? '700' : '500',
                    color: isBest ? '#ef4444' : '#94a3b8'
                  }}>
                    {d.short}
                  </div>
                )
              })}
            </div>

            {/* Isı Grid */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>🗓️ Yoğunluk Tablosu</div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, 1fr)`, gap: '4px' }}>
                {dailyData.map((d, i) => {
                  const intensity = stats.maxDay > 0 ? d.total / stats.maxDay : 0
                  const bgColor = intensity === 0 ? '#0f172a' : intensity < 0.25 ? '#064e3b' : intensity < 0.5 ? '#065f46' : intensity < 0.75 ? '#047857' : '#10b981'
                  return (
                    <div key={i} style={{
                      backgroundColor: bgColor, borderRadius: '8px', padding: '0.75rem 0.5rem',
                      textAlign: 'center', border: intensity > 0.75 ? '1px solid #10b981' : '1px solid #1e293b'
                    }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>{d.short}</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: intensity > 0 ? '#f8fafc' : '#334155' }}>
                        {d.total > 0 ? formatCurrency(d.total).replace('₺', '').trim() : '-'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{d.count} satış</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #334155' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Az</span>
              {['#0f172a', '#064e3b', '#065f46', '#047857', '#059669', '#10b981'].map((c, i) => (
                <div key={i} style={{ width: '20px', height: '14px', borderRadius: '3px', backgroundColor: c, border: '1px solid #334155' }} />
              ))}
              <span style={{ fontSize: '11px', color: '#64748b' }}>Çok</span>
            </div>

            {/* İpucu */}
            {stats.bestDay && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '18px' }}>💡</span>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  <strong style={{ color: '#f59e0b' }}>{stats.bestDay}</strong> günleri en yoğun satış yapılan gün. Ortalama <strong style={{ color: '#10b981' }}>{formatCurrency(stats.avgPerDay || 0)}</strong> satış yapılıyor.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
