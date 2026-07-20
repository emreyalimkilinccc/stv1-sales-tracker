'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function WeeklyGoal() {
  const { user } = useAuth()
  const [data, setData] = useState({ weekTotal: 0, goal: 0, percentage: 0, avgDaily: 0, daysLeft: 0, projected: 0 })
  const [loading, setLoading] = useState(true)
  const [goalInput, setGoalInput] = useState('')
  const [showInput, setShowInput] = useState(false)

  useEffect(() => {
    if (!user) return
    try {
      const saved = parseInt(localStorage.getItem('stv1-weekly-goal-' + user.uid) || '0')
      if (saved > 0) setGoalInput(String(saved))
    } catch (e) {}
  }, [user])

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      try {
        const now = new Date()
        const dayOfWeek = (now.getDay() + 6) % 7
        const monday = new Date(now)
        monday.setDate(now.getDate() - dayOfWeek)
        monday.setHours(0, 0, 0, 0)
        const mondayStr = monday.toISOString().split('T')[0]
        const daysPassed = dayOfWeek + 1
        const daysLeft = 7 - dayOfWeek

        const snap = await getDocs(query(collection(db, 'sales'), where('date', '>=', mondayStr)))
        let weekTotal = 0
        snap.docs.forEach(d => {
          const s = d.data()
          if (s.userId === user.uid || user.role !== 'STAFF') {
            weekTotal += parseFloat(s.amount) || 0
          }
        })

        const savedGoal = parseInt(localStorage.getItem('stv1-weekly-goal-' + user.uid) || '50000')
        const avgDaily = daysPassed > 0 ? weekTotal / daysPassed : 0
        const projected = avgDaily * 7
        const percentage = savedGoal > 0 ? Math.min(100, (weekTotal / savedGoal) * 100) : 0

        setData({ weekTotal, goal: savedGoal, percentage, avgDaily, daysLeft, projected })
      } catch (e) {}
      setLoading(false)
    }
    fetchData()
  }, [user])

  if (!user || loading) return null

  const formatCurrency = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)

  const saveGoal = () => {
    const val = parseInt(goalInput) || 0
    localStorage.setItem('stv1-weekly-goal-' + user.uid, String(val))
    setData(prev => ({ ...prev, goal: val, percentage: val > 0 ? Math.min(100, (prev.weekTotal / val) * 100) : 0 }))
    setShowInput(false)
    toast('Hedef güncellendi!', 'success')
  }

  const toast = (msg) => {
    try { alert(msg) } catch (e) {}
  }

  const pct = Math.round(data.percentage)
  const barColor = pct >= 100 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#3b82f6'

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>🎯 Haftalık Hedef</h3>
        <button onClick={() => setShowInput(!showInput)} style={{
          fontSize: '11px', color: '#3b82f6', border: 'none', backgroundColor: 'transparent',
          cursor: 'pointer', fontWeight: '600'
        }}>
          {showInput ? 'Kapat' : '✏️ Hedef Değiştir'}
        </button>
      </div>

      {showInput && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input type="number" value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
            placeholder="Haftalık hedef (TL)" className="form-input" style={{ flex: 1, fontSize: '13px' }} />
          <button onClick={saveGoal} style={{
            padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '13px', fontWeight: '600',
            border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff'
          }}>Kaydet</button>
        </div>
      )}

      {/* Hedef Çubuğu */}
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '0.375rem' }}>
          <span style={{ color: '#94a3b8' }}>{formatCurrency(data.weekTotal)} / {formatCurrency(data.goal)}</span>
          <span style={{ color: barColor, fontWeight: '700' }}>%{pct}</span>
        </div>
        <div style={{ width: '100%', height: '12px', backgroundColor: '#1e293b', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${Math.min(100, pct)}%`,
            background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
            borderRadius: '6px', transition: 'width 0.5s ease',
            boxShadow: pct >= 100 ? `0 0 12px ${barColor}66` : 'none'
          }} />
        </div>
      </div>

      {/* Alt Bilgiler */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '0.375rem', borderRadius: '0.5rem', backgroundColor: '#0f172a' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#06b6d4' }}>{formatCurrency(data.avgDaily)}</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Günlük Ort.</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '0.375rem', borderRadius: '0.5rem', backgroundColor: '#0f172a' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#f59e0b' }}>{data.daysLeft} gün</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Kalan Gün</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', padding: '0.375rem', borderRadius: '0.5rem', backgroundColor: '#0f172a' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: data.projected >= data.goal ? '#10b981' : '#ef4444' }}>
            {formatCurrency(data.projected)}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Tahmini</div>
        </div>
      </div>
    </div>
  )
}
