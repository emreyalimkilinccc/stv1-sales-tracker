'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import LotteryWheel from '@/components/LotteryWheel'

const PARTICIPANTS = [
  { name: 'Emre YALIMKILINÇ', color: '#3b82f6', emoji: '👨‍💼' },
  { name: 'Derya DEMİR', color: '#8b5cf6', emoji: '👩‍💼' },
  { name: 'Sevim TEKİN', color: '#10b981', emoji: '👩‍💻' },
  { name: 'Onur VARAN', color: '#f59e0b', emoji: '👨‍💻' },
  { name: 'Merve KARAASLAN', color: '#ef4444', emoji: '👩‍💻' }
]

export default function LotteryPage() {
  const { user } = useAuth()
  const [activeLottery, setActiveLottery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  const canManage = user && (user.role === 'ADMIN' || user.role === 'MANAGER')

  useEffect(() => {
    if (user) fetchActiveLottery()
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [user])

  const fetchActiveLottery = async () => {
    try {
      const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })
      const snapshot = await getDocs(query(collection(db, 'lottery'), where('date', '==', todayStr)))
      if (!snapshot.empty) {
        setActiveLottery({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() })
      } else {
        setActiveLottery(null)
      }
    } catch (error) { console.error(error) } finally { setLoading(false) }
  }

  const handleConfirm = async (winner) => {
    try {
      const nowDate = new Date()
      const todayStr = nowDate.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })
      const midnight = new Date(nowDate); midnight.setHours(24, 0, 0, 0)

      if (activeLottery) {
        await updateDoc(doc(db, 'lottery', activeLottery.id), { winner: winner.name, activatedAt: nowDate.toISOString(), isActive: true })
      } else {
        await addDoc(collection(db, 'lottery'), {
          date: todayStr, winner: winner.name, activatedAt: nowDate.toISOString(),
          expiresAt: midnight.toISOString(), isActive: true, createdBy: user.name || user.email
        })
      }
      fetchActiveLottery()
    } catch (error) { alert('Hata: ' + error.message) }
  }

  const handleEnd = async () => {
    try {
      if (activeLottery) {
        await updateDoc(doc(db, 'lottery', activeLottery.id), { isActive: false })
        setActiveLottery(null)
      }
    } catch (error) { alert('Hata: ' + error.message) }
  }

  const timeUntilMidnight = () => {
    const midnight = new Date(now); midnight.setHours(24, 0, 0, 0)
    const diff = midnight - now
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  if (!user || !canManage) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px', textAlign: 'center' }}>🚫<br /><span style={{ fontSize: '14px', color: '#94a3b8' }}>Erişim yetkiniz yok</span></div></div>
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.15, transform: 'rotate(15deg)' }}>🎰</div>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem', position: 'relative' }}>🎰 Çekiliş</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', position: 'relative' }}>Şanslı kişiyi belirleyin</p>
      </div>

      {/* Aktif Çekiliş Uyarısı */}
      {activeLottery && activeLottery.isActive && (
        <div className="card" style={{ borderLeft: '4px solid #10b981', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>🏆 Aktif Çekiliş Var!</div>
              <div style={{ fontSize: '14px', color: '#f8fafc', marginTop: '0.25rem' }}>Kazanan: <strong>{activeLottery.winner}</strong></div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.25rem' }}>{activeLottery.createdBy} tarafından başlatıldı</div>
              <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '0.375rem', fontWeight: '600' }}>⏰ Bitişe kalan: {timeUntilMidnight()}</div>
            </div>
            <button onClick={handleEnd} style={{
              padding: '0.5rem 1.25rem', borderRadius: '0.5rem', fontSize: '13px', fontWeight: '600',
              backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer'
            }}>⏹️ Bitir</button>
          </div>
        </div>
      )}

      {/* Çekiliş Çarkı */}
      <div className="card">
        <LotteryWheel onWinner={handleConfirm} />
      </div>

      {/* Katılımcılar */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>👥 Katılımcılar</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {PARTICIPANTS.map(p => {
            const isWinner = activeLottery?.isActive && activeLottery?.winner === p.name
            return (
              <div key={p.name} style={{
                backgroundColor: isWinner ? `${p.color}15` : '#0f172a',
                borderRadius: '0.75rem', padding: '0.875rem',
                border: `2px solid ${isWinner ? p.color : `${p.color}30`}`,
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                boxShadow: isWinner ? `0 0 15px ${p.color}30` : 'none'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: `${p.color}20`, border: `2px solid ${p.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px'
                }}>{p.emoji}</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{p.name}</div>
                {isWinner && <div style={{ marginLeft: 'auto', fontSize: '16px' }}>🏆</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
