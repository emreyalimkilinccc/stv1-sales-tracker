'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8)

export default function IsiHaritasiPage() {
  const { user } = useAuth()
  const [heatmap, setHeatmap] = useState({})
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('week')
  const [stats, setStats] = useState({ total: 0, bestDay: '', bestHour: '', avgPerDay: 0, peakHour: 0, peakDay: 0, totalSales: 0 })
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, 'sales'))
        const data = snap.docs.map(d => d.data()).filter(s => s.sentBy || s.amount)
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

        const grid = {}
        let total = 0
        let totalSales = 0
        const dayTotals = {}
        const hourTotals = {}

        filtered.forEach(s => {
          let dayIdx = 0, hour = 12
          try {
            if (s.date) { const d = new Date(s.date); dayIdx = (d.getDay() + 6) % 7 }
            if (s.time) hour = parseInt(s.time.split(':')[0])
          } catch (e) {}
          const amount = parseFloat(s.amount) || 0
          total += amount
          totalSales++
          const key = `${dayIdx}-${hour}`
          grid[key] = (grid[key] || 0) + amount
          dayTotals[dayIdx] = (dayTotals[dayIdx] || 0) + amount
          hourTotals[hour] = (hourTotals[hour] || 0) + amount
        })

        const bestDayEntry = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0]
        const bestHourEntry = Object.entries(hourTotals).sort((a, b) => b[1] - a[1])[0]
        const days = period === 'week' ? 7 : 30

        setHeatmap(grid)
        setStats({
          total, totalSales,
          bestDay: bestDayEntry ? DAYS_TR[bestDayEntry[0]] : '-',
          bestHour: bestHourEntry ? `${bestHourEntry[0]}:00` : '-',
          avgPerDay: Math.round(total / days),
          peakHour: bestHourEntry ? parseInt(bestHourEntry[0]) : 0,
          peakDay: bestDayEntry ? parseInt(bestDayEntry[0]) : 0
        })
      } catch (e) {}
      setLoading(false)
    }
    fetchData()
  }, [user, period])

  if (!user) return null

  const values = Object.values(heatmap)
  const maxVal = Math.max(...values, 1)

  const getHeatColor = (val) => {
    if (val === 0) return { bg: '#0f172a', text: '#334155' }
    const intensity = val / maxVal
    if (intensity < 0.15) return { bg: '#064e3b', text: '#6ee7b7' }
    if (intensity < 0.3) return { bg: '#065f46', text: '#6ee7b7' }
    if (intensity < 0.5) return { bg: '#047857', text: '#a7f3d0' }
    if (intensity < 0.7) return { bg: '#059669', text: '#d1fae5' }
    return { bg: '#10b981', text: '#ffffff' }
  }

  const formatCurrency = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)
  const formatShort = (val) => {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
    if (val >= 1000) return (val / 1000).toFixed(0) + 'K'
    return val.toFixed(0)
  }

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #f97316 50%, #f59e0b 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.1, transform: 'rotate(15deg)' }}>🔥</div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem', position: 'relative' }}>🔥 Satış Isı Haritası</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', position: 'relative' }}>Hangi saatte ne kadar satış yapıldığını görün</p>
      </div>

      {/* Dönem Seçimi */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        {[{ key: 'week', label: 'Son 7 Gün', icon: '📅' }, { key: 'month', label: 'Son 30 Gün', icon: '📆' }].map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} style={{
            flex: 1, padding: '0.875rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: '600',
            border: `2px solid ${period === p.key ? '#ef4444' : '#334155'}`,
            backgroundColor: period === p.key ? 'rgba(239,68,68,0.15)' : '#0f172a',
            color: period === p.key ? '#ef4444' : '#94a3b8', cursor: 'pointer',
            transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
          }}>
            <span>{p.icon}</span> {p.label}
          </button>
        ))}
      </div>

      {/* İstatistikler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '1rem' }}>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Toplam Satış</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>{formatCurrency(stats.total)}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>{stats.totalSales} işlem</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Günlük Ortalama</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#06b6d4' }}>{formatCurrency(stats.avgPerDay)}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>{period === 'week' ? '7' : '30'} gün ortalaması</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En Yoğun Gün</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b' }}>{stats.bestDay}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>En çok satış yapılan gün</div>
        </div>
        <div className="card" style={{ padding: '1rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En Yoğun Saat</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444' }}>{stats.bestHour}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>En çok satış yapılan saat</div>
        </div>
      </div>

      {/* Isı Haritası */}
      <div className="card" style={{ marginTop: '1rem', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '16px' }}>🗓️</span>
          <span style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>Saatlik Dağılım</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>⏳</div>
            Veriler yükleniyor...
          </div>
        ) : (
          <div style={{ padding: '1rem', overflowX: 'auto' }}>
            <div style={{ minWidth: '600px' }}>
              {/* Saat Başlıkları */}
              <div style={{ display: 'grid', gridTemplateColumns: `70px repeat(${HOURS.length}, 1fr)`, gap: '3px', marginBottom: '6px' }}>
                <div />
                {HOURS.map(h => (
                  <div key={h} style={{
                    fontSize: '10px', color: h === stats.peakHour ? '#ef4444' : '#64748b',
                    textAlign: 'center', padding: '4px 0',
                    fontWeight: h === stats.peakHour ? '700' : '400'
                  }}>
                    {h}:00
                  </div>
                ))}
              </div>

              {/* Satırlar */}
              {DAYS_TR.map((day, dayIdx) => (
                <div key={dayIdx} style={{ display: 'grid', gridTemplateColumns: `70px repeat(${HOURS.length}, 1fr)`, gap: '3px', marginBottom: '3px' }}>
                  <div style={{
                    fontSize: '11px', color: dayIdx === stats.peakDay ? '#f59e0b' : '#94a3b8',
                    display: 'flex', alignItems: 'center', paddingRight: '6px', whiteSpace: 'nowrap',
                    fontWeight: dayIdx === stats.peakDay ? '700' : '400'
                  }}>
                    {day.substring(0, 3)}
                  </div>
                  {HOURS.map(h => {
                    const val = heatmap[`${dayIdx}-${h}`] || 0
                    const isPeak = dayIdx === stats.peakDay && h === stats.peakHour
                    const colors = getHeatColor(val)
                    return (
                      <div
                        key={h}
                        onMouseEnter={() => setTooltip({ day, hour: h, value: val, x: 0, y: 0 })}
                        onMouseLeave={() => setTooltip(null)}
                        style={{
                          backgroundColor: colors.bg,
                          borderRadius: '4px', height: '36px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', color: colors.text, fontWeight: '600',
                          border: isPeak ? '2px solid #ef4444' : '1px solid transparent',
                          cursor: 'pointer', transition: 'all 0.15s ease',
                          position: 'relative'
                        }}
                      >
                        {val > 0 ? formatShort(val) : ''}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #334155' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Az</span>
              {['#0f172a', '#064e3b', '#065f46', '#047857', '#059669', '#10b981'].map((c, i) => (
                <div key={i} style={{ width: '20px', height: '14px', borderRadius: '3px', backgroundColor: c, border: '1px solid #334155' }} />
              ))}
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>Çok</span>
            </div>

            {/* Peak İpucu */}
            {stats.bestDay !== '-' && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '18px' }}>💡</span>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  <strong style={{ color: '#f59e0b' }}>{stats.bestDay}</strong> günleri{' '}
                  <strong style={{ color: '#ef4444' }}>{stats.bestHour}</strong> civarında en yoğun satış yapılıyor.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.75rem',
          padding: '1rem 1.25rem', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          textAlign: 'center', minWidth: '180px'
        }}>
          <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: '600', marginBottom: '0.25rem' }}>{tooltip.day} {tooltip.hour}:00</div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{formatCurrency(tooltip.value)}</div>
        </div>
      )}
    </div>
  )
}
