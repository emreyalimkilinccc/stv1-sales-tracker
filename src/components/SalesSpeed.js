'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function SalesSpeed() {
  const { user } = useAuth()
  const [data, setData] = useState({ todayTotal: 0, hourAvg: 0, speed: '', remaining: 0, bestHour: '', hourlyData: {} })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      try {
        const now = new Date()
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
        const currentHour = now.getHours()

        const snap = await getDocs(query(collection(db, 'sales'), where('date', '==', todayStr)))
        let todayTotal = 0
        const hourlyData = {}

        snap.docs.forEach(d => {
          const s = d.data()
          if (s.userId === user.uid || user.role !== 'STAFF') {
            const amount = parseFloat(s.amount) || 0
            todayTotal += amount
            const h = parseInt(s.hour) || 12
            hourlyData[h] = (hourlyData[h] || 0) + amount
          }
        })

        const hoursWorked = Math.max(currentHour - 9, 1)
        const hourAvg = todayTotal / hoursWorked
        const remaining = 18 - currentHour
        const projected = todayTotal + (hourAvg * remaining)

        let bestHour = '-'
        let bestVal = 0
        Object.entries(hourlyData).forEach(([h, v]) => {
          if (v > bestVal) { bestVal = v; bestHour = `${h}:00` }
        })

        let speed = ''
        if (todayTotal > 0) {
          if (hourAvg > 50000) speed = '🔥 Çok Hızlı'
          else if (hourAvg > 25000) speed = '💪 İyi Gidiyor'
          else if (hourAvg > 10000) speed = '👍 Normal'
          else speed = '🐢 Yavaş'
        } else {
          speed = '⏳ Henüz satış yok'
        }

        setData({ todayTotal, hourAvg, speed, remaining: Math.max(remaining, 0), bestHour, hourlyData })
      } catch (e) {}
      setLoading(false)
    }
    fetchData()
  }, [user])

  if (!user || loading) return null

  const formatCurrency = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)

  return (
    <div className="card">
      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>
        ⚡ Satış Hızı Göstergesi
      </h3>

      {/* Hız Göstergesi */}
      <div style={{ textAlign: 'center', padding: '0.75rem 0', marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '28px', fontWeight: '800', color: '#06b6d4' }}>{data.speed}</div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: '#f8fafc', marginTop: '0.25rem' }}>
          {formatCurrency(data.todayTotal)}
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>bugünkü toplam satış</div>
      </div>

      {/* Saatlik Analiz */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
        <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: '#0f172a' }}>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>{formatCurrency(data.hourAvg)}</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Saatlik Ortalama</div>
        </div>
        <div style={{ textAlign: 'center', padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: '#0f172a' }}>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#f59e0b' }}>{data.bestHour}</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>En Aktif Saat</div>
        </div>
      </div>

      {/* Saatlik Dağılım Bar */}
      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '0.375rem' }}>📊 Saatlik Dağılım</div>
        <div style={{ display: 'flex', gap: '2px', height: '24px', alignItems: 'flex-end' }}>
          {Array.from({ length: 12 }, (_, i) => {
            const h = i + 8
            const val = data.hourlyData[h] || 0
            const max = Math.max(...Object.values(data.hourlyData), 1)
            const height = val > 0 ? Math.max(4, (val / max) * 100) : 2
            return (
              <div key={h} title={`${h}:00 — ${formatCurrency(val)}`} style={{
                flex: 1, height: `${height}%`, minHeight: '2px',
                backgroundColor: val > 0 ? '#06b6d4' : '#1e293b',
                borderRadius: '2px', transition: 'height 0.3s ease'
              }} />
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '8px', color: '#475569' }}>{i + 8}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
