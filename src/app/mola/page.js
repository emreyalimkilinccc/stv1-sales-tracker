'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, addDoc, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function MolaPage() {
  const { user } = useAuth()
  const [breaks, setBreaks] = useState([])
  const [activeBreak, setActiveBreak] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'breaks'), where('userId', '==', user.uid), where('date', '==', today), orderBy('startTime', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setBreaks(list)
      const active = list.find(b => !b.endTime)
      setActiveBreak(active || null)
      setLoading(false)
    })
    return () => unsub()
  }, [user, today])

  useEffect(() => {
    if (!activeBreak) { setElapsed(0); return }
    const start = new Date(activeBreak.startTime)
    const tick = () => setElapsed(Math.floor((Date.now() - start.getTime()) / 1000))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [activeBreak])

  const startBreak = async () => {
    if (activeBreak) return
    await addDoc(collection(db, 'breaks'), {
      userId: user.uid,
      userName: user.name || user.email,
      date: today,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      type: 'molada'
    })
  }

  const endBreak = async () => {
    if (!activeBreak) return
    const start = new Date(activeBreak.startTime)
    const duration = Math.floor((Date.now() - start.getTime()) / 1000)
    await updateDoc(doc(db, 'breaks', activeBreak.id), {
      endTime: new Date().toISOString(),
      duration
    })
  }

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}d ${s < 10 ? '0' : ''}${s}s`
  }

  const allBreaksToday = breaks.filter(b => b.endTime)
  const totalMinutes = Math.floor(allBreaksToday.reduce((sum, b) => sum + (b.duration || 0), 0) / 60)

  if (!user) return null

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>☕ Ekip Molası Takibi</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Bugünkü molalarınız ve süre takibi</p>
      </div>

      {/* Mola Başlat/Durdur */}
      <div className="card" style={{ marginTop: '1rem' }}>
        {activeBreak ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '0.75rem' }}>☕</div>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '0.5rem' }}>Moladasınız</div>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#f59e0b', fontFamily: 'monospace', marginBottom: '1.5rem' }}>{formatDuration(elapsed)}</div>
            <button onClick={endBreak} style={{
              padding: '0.875rem 2rem', borderRadius: '0.75rem', fontSize: '15px', fontWeight: '600',
              border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
              boxShadow: '0 4px 12px rgba(239,68,68,0.4)'
            }}>
              ⏹️ Mola Bitir
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '0.75rem' }}>💪</div>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '1.5rem' }}>Molaya çıkmak için butona tıklayın</div>
            <button onClick={startBreak} style={{
              padding: '0.875rem 2rem', borderRadius: '0.75rem', fontSize: '15px', fontWeight: '600',
              border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
              boxShadow: '0 4px 12px rgba(16,185,129,0.4)'
            }}>
              ▶️ Mola Başlat
            </button>
          </div>
        )}
      </div>

      {/* Bugünkü Özet */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>{allBreaksToday.length}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Toplam Mola</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b' }}>{totalMinutes} dk</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Toplam Süre</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#06b6d4' }}>{allBreaksToday.length > 0 ? Math.round(totalMinutes / allBreaksToday.length) : 0} dk</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Ortalama Süre</div>
        </div>
      </div>

      {/* Mola Listesi */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📋 Bugünkü Molalar</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Yükleniyor...</div>
        ) : breaks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Bugün mola kaydı yok</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {breaks.map(b => {
              const start = new Date(b.startTime)
              const startStr = start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })
              const isActive = !b.endTime
              return (
                <div key={b.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 1rem', borderRadius: '0.75rem',
                  backgroundColor: isActive ? 'rgba(245,158,11,0.1)' : '#0f172a',
                  border: `1px solid ${isActive ? 'rgba(245,158,11,0.3)' : '#334155'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '20px' }}>{isActive ? '☕' : '✅'}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{startStr}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{isActive ? 'Devam ediyor...' : `${Math.floor((b.duration || 0) / 60)} dakika`}</div>
                    </div>
                  </div>
                  {isActive && <span style={{ fontSize: '12px', fontWeight: '600', color: '#f59e0b', padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: 'rgba(245,158,11,0.15)' }}>AKTİF</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
