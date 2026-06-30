'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import LotteryWheel from '@/components/LotteryWheel'

export default function LotteryPage() {
  const { user } = useAuth()
  const [activeLottery, setActiveLottery] = useState(null)
  const [loading, setLoading] = useState(true)

  const canManage = user && (user.role === 'ADMIN' || user.role === 'MANAGER')

  useEffect(() => {
    if (user) fetchActiveLottery()
  }, [user])

  const fetchActiveLottery = async () => {
    try {
      const now = new Date()
      const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })
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
      const now = new Date()
      const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })

      if (activeLottery) {
        await updateDoc(doc(db, 'lottery', activeLottery.id), {
          winner: winner.name,
          activatedAt: now.toISOString(),
          isActive: true
        })
      } else {
        const midnight = new Date(now)
        midnight.setHours(24, 0, 0, 0)

        await addDoc(collection(db, 'lottery'), {
          date: todayStr,
          winner: winner.name,
          activatedAt: now.toISOString(),
          expiresAt: midnight.toISOString(),
          isActive: true,
          createdBy: user.name || user.email
        })
      }

      fetchActiveLottery()
      alert(`🏆 ${winner.name} kazanan olarak ilan edildi!`)
    } catch (error) {
      alert('Hata: ' + error.message)
    }
  }

  const handleEnd = async () => {
    try {
      if (activeLottery) {
        await updateDoc(doc(db, 'lottery', activeLottery.id), { isActive: false })
        setActiveLottery(null)
        alert('Çekiliş sona erdi!')
      }
    } catch (error) {
      alert('Hata: ' + error.message)
    }
  }

  if (!user || !canManage) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px', textAlign: 'center' }}>🚫<br /><span style={{ fontSize: '14px', color: '#94a3b8' }}>Erişim yetkiniz yok</span></div></div>
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>🎰 Çekiliş</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Şanslı kişiyi belirleyin</p>
      </div>

      {/* Aktif Çekiliş Uyarısı */}
      {activeLottery && activeLottery.isActive && (
        <div className="card" style={{ borderLeft: '4px solid #10b981', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>🏆 Aktif Çekiliş Var!</div>
              <div style={{ fontSize: '14px', color: '#f8fafc', marginTop: '0.25rem' }}>
                Kazanan: <strong>{activeLottery.winner}</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.25rem' }}>
                {activeLottery.createdBy} tarafından başlatıldı
              </div>
            </div>
            <button onClick={handleEnd} style={{
              padding: '0.5rem 1.25rem', borderRadius: '0.5rem', fontSize: '13px', fontWeight: '600',
              backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)',
              cursor: 'pointer'
            }}>
              ⏹️ Bitir
            </button>
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
          {[
            { name: 'Emre YALIMKILINÇ', color: '#3b82f6' },
            { name: 'Derya DEMİR', color: '#8b5cf6' },
            { name: 'Sevim TEKİN', color: '#10b981' },
            { name: 'Onur VARAN', color: '#f59e0b' },
            { name: 'Merve KARAASLAN', color: '#ef4444' }
          ].map(p => (
            <div key={p.name} style={{
              backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '0.875rem',
              border: `2px solid ${p.color}30`, display: 'flex', alignItems: 'center', gap: '0.625rem'
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: `${p.color}20`, border: `2px solid ${p.color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: '700', color: p.color
              }}>
                {p.name.split(' ')[0][0]}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>
                {p.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
