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
  const [stats, setStats] = useState({ total: 0, bestDay: '', bestHour: '', avgPerDay: 0 })

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
            const weekAgo = new Date(now)
            weekAgo.setDate(weekAgo.getDate() - 7)
            return d >= weekAgo
          } else {
            const monthAgo = new Date(now)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            return d >= monthAgo
          }
        })

        const grid = {}
        let total = 0
        const dayTotals = {}
        const hourTotals = {}

        filtered.forEach(s => {
          let dayIdx = 0
          let hour = 12
          try {
            if (s.date) {
              const d = new Date(s.date)
              dayIdx = (d.getDay() + 6) % 7
            }
            if (s.time) {
              hour = parseInt(s.time.split(':')[0])
            }
          } catch (e) {}

          const amount = parseFloat(s.amount) || 0
          total += amount

          const key = `${dayIdx}-${hour}`
          grid[key] = (grid[key] || 0) + amount

          dayTotals[dayIdx] = (dayTotals[dayIdx] || 0) + amount
          hourTotals[hour] = (hourTotals[hour] || 0) + amount
        })

        const bestDayIdx = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0]
        const bestHourEntry = Object.entries(hourTotals).sort((a, b) => b[1] - a[1])[0]
        const days = period === 'week' ? 7 : 30

        setHeatmap(grid)
        setStats({
          total,
          bestDay: bestDayIdx ? DAYS_TR[bestDayIdx[0]] : '-',
          bestHour: bestHourEntry ? `${bestHourEntry[0]}:00` : '-',
          avgPerDay: Math.round(total / days)
        })
      } catch (e) {}
      setLoading(false)
    }
    fetchData()
  }, [user, period])

  if (!user) return null

  const values = Object.values(heatmap)
  const maxVal = Math.max(...values, 1)

  const getColor = (val) => {
    if (val === 0) return '#1e293b'
    const intensity = val / maxVal
    if (intensity < 0.2) return 'rgba(16,185,129,0.15)'
    if (intensity < 0.4) return 'rgba(16,185,129,0.3)'
    if (intensity < 0.6) return 'rgba(16,185,129,0.5)'
    if (intensity < 0.8) return 'rgba(16,185,129,0.7)'
    return 'rgba(16,185,129,0.9)'
  }

  const formatCurrency = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>🔥 Satış Isı Haritası</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Hangi saatte ne kadar satış yapıldığını görün</p>
      </div>

      {/* Dönem Seçimi */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', marginBottom: '1rem' }}>
        {[{ key: 'week', label: 'Son 7 Gün' }, { key: 'month', label: 'Son 30 Gün' }].map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} style={{
            flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: '600',
            border: `2px solid ${period === p.key ? '#ef4444' : '#334155'}`,
            backgroundColor: period === p.key ? 'rgba(239,68,68,0.15)' : '#0f172a',
            color: period === p.key ? '#ef4444' : '#94a3b8', cursor: 'pointer'
          }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* İstatistikler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{formatCurrency(stats.total)}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Toplam Satış</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>{stats.bestDay}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>En Yoğun Gün</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>{stats.bestHour}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>En Yoğun Saat</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#06b6d4' }}>{formatCurrency(stats.avgPerDay)}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Günlük Ort.</div>
        </div>
      </div>

      {/* Isı Haritası */}
      <div className="card" style={{ marginTop: '1rem', overflowX: 'auto' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>🗓️ Saatlik Dağılım</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Yükleniyor...</div>
        ) : (
          <div style={{ minWidth: '600px' }}>
            {/* Saat Başlıkları */}
            <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${HOURS.length}, 1fr)`, gap: '2px', marginBottom: '4px' }}>
              <div />
              {HOURS.map(h => (
                <div key={h} style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', padding: '2px' }}>{h}:00</div>
              ))}
            </div>

            {/* Satırlar */}
            {DAYS_TR.map((day, dayIdx) => (
              <div key={dayIdx} style={{ display: 'grid', gridTemplateColumns: `80px repeat(${HOURS.length}, 1fr)`, gap: '2px', marginBottom: '2px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', paddingRight: '4px', whiteSpace: 'nowrap' }}>
                  {day.substring(0, 3)}
                </div>
                {HOURS.map(h => {
                  const val = heatmap[`${dayIdx}-${h}`] || 0
                  return (
                    <div key={h} title={`${day} ${h}:00 — ${formatCurrency(val)}`} style={{
                      backgroundColor: getColor(val),
                      borderRadius: '3px', height: '28px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', color: val > 0 ? '#f8fafc' : '#334155', fontWeight: '600'
                    }}>
                      {val > 0 ? formatCurrency(val).replace('₺', '') : ''}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #334155' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Az</span>
          {[0.1, 0.25, 0.4, 0.6, 0.8].map((op, i) => (
            <div key={i} style={{ width: '16px', height: '16px', borderRadius: '3px', backgroundColor: `rgba(16,185,129,${op})` }} />
          ))}
          <span style={{ fontSize: '11px', color: '#64748b' }}>Çok</span>
        </div>
      </div>
    </div>
  )
}
