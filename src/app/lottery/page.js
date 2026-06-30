'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import LotteryWheel from '@/components/LotteryWheel'

const PARTICIPANTS = [
  { name: 'Emre YALIMKILINÇ', color: '#3b82f6', emoji: '👨‍💼', role: 'Yönetici' },
  { name: 'Derya DEMİR', color: '#8b5cf6', emoji: '👩‍💼', role: 'Müdür' },
  { name: 'Sevim TEKİN', color: '#10b981', emoji: '👩‍💻', role: 'Personel' },
  { name: 'Onur VARAN', color: '#f59e0b', emoji: '👨‍💻', role: 'Personel' },
  { name: 'Merve KARAASLAN', color: '#ef4444', emoji: '👩‍💻', role: 'Personel' }
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

  if (!user || !canManage) return (
    <div className="min-h-screen flex items-center justify-center">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🚫</div>
        <div style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>Erişim Yetkiniz Yok</div>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>Bu sayfaya sadece Yönetici ve Mağaza Müdürü erişebilir</div>
      </div>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', animation: 'spin 1s linear infinite' }}>🎰</div>
        <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '1rem' }}>Yükleniyor...</div>
      </div>
    </div>
  )

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      {/* Başlık */}
      <div className="page-header" style={{
        background: 'linear-gradient(135deg, #8b5cf6, #6d28d9, #7c3aed)',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.15, transform: 'rotate(15deg)' }}>🎰</div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem', position: 'relative' }}>🎰 Çekiliş</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', position: 'relative' }}>Şanslı kişiyi belirleyin — herkes izlesin!</p>
      </div>

      {/* Aktif Çekiliş Uyarısı */}
      {activeLottery && activeLottery.isActive && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,95,70,0.1))',
          border: '2px solid rgba(16,185,129,0.3)', borderRadius: '1rem',
          padding: '1.25rem', marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '20px' }}>🏆</span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>Aktif Çekiliş Devam Ediyor!</span>
              </div>
              <div style={{ fontSize: '15px', color: '#f8fafc' }}>
                Kazanan: <strong style={{ color: '#10b981' }}>{activeLottery.winner}</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.25rem' }}>
                {activeLottery.createdBy} tarafından başlatıldı
              </div>
              <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '0.375rem', fontWeight: '600' }}>
                ⏰ Bitişe kalan süre: {timeUntilMidnight()}
              </div>
            </div>
            <button onClick={handleEnd} style={{
              padding: '0.625rem 1.5rem', borderRadius: '9999px', fontSize: '13px', fontWeight: '600',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)'
            }}>
              ⏹️ Çekilişi Bitir
            </button>
          </div>
        </div>
      )}

      {/* Çekiliş Çarkı */}
      <div className="card" style={{ padding: '2rem 1rem' }}>
        <LotteryWheel onWinner={handleConfirm} />
      </div>

      {/* Katılımcılar */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '18px' }}>👥</span>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>Katılımcılar</h3>
          <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '0.25rem' }}>({PARTICIPANTS.length} kişi)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {PARTICIPANTS.map(p => {
            const isActive = activeLottery?.isActive && activeLottery?.winner === p.name
            return (
              <div key={p.name} style={{
                backgroundColor: isActive ? `${p.color}15` : '#0f172a',
                borderRadius: '1rem', padding: '1rem',
                border: `2px solid ${isActive ? p.color : `${p.color}25`}`,
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                transition: 'all 0.3s ease',
                transform: isActive ? 'scale(1.02)' : 'none',
                boxShadow: isActive ? `0 0 20px ${p.color}30` : 'none'
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  backgroundColor: `${p.color}20`, border: `2px solid ${p.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', flexShrink: 0
                }}>
                  {p.emoji}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{p.name}</div>
                  <div style={{ fontSize: '11px', color: p.color, fontWeight: '500' }}>{p.role}</div>
                </div>
                {isActive && (
                  <div style={{ marginLeft: 'auto', fontSize: '18px' }}>🏆</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
