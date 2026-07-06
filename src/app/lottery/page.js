'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import LotteryWheel from '@/components/LotteryWheel'
import { useToast } from '@/components/Toast'

const CATEGORY_MAP = {
  'Emre YALIMKILINÇ': 'Giriş kat', 'Derya DEMİR': 'Giriş kat', 'Sevim TEKİN': 'Giriş kat',
  'Onur VARAN': 'Giriş kat', 'Merve KARAASLAN': 'Giriş kat', 'Mehmet Fatih SEPİK': 'Giriş kat',
  'Bilge TURAN': 'Züccaciye', 'ELİF DEMİR': 'Züccaciye',
  'Rabia ÇALHAN': 'Mobilya', 'Nurdagül MENEKŞE': 'Mobilya',
  'Seda SOYDAN': 'Kasa', 'Özge KEL': 'Kasa', 'Şennur ŞAHİN': 'Kasa', 'Betül Merve GÜNGÖR': 'Kasa'
}

// Esnek isim eşleştirme — büyük/küçük harf ve boşluk farkı tolere edilir
const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
function findCategory(userName) {
  const norm = normalize(userName)
  for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
    if (normalize(key) === norm) return cat
  }
  return 'Kategorisiz'
}

export default function LotteryPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [activeLottery, setActiveLottery] = useState(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [participants, setParticipants] = useState([])
  const [stores, setStores] = useState([])

  const canManage = user && (user.role === 'ADMIN' || user.role === 'MANAGER')

  useEffect(() => {
    if (user && canManage) { fetchActiveLottery(); fetchStores() }
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [user])

  useEffect(() => {
    if (canManage) fetchParticipants()
  }, [selectedCategory, stores])

  const fetchStores = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'stores'))
      setStores(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) { console.error(error) }
  }

  const fetchParticipants = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'user'))
      let allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))

      // Sales kodu olmayan admin çekilişe katılmasın
      allUsers = allUsers.filter(u => {
        if (u.role === 'ADMIN' && (!u.salesCode || u.salesCode.trim() === '')) return false
        return true
      })

      // Kategorileri her zaman CATEGORY_MAP'ten ata (Firestore'dan bağımsız)
      const categorized = allUsers.map(u => ({
        ...u,
        category: findCategory(u.name)
      }))

      // Kategori filtresi
      let filtered = categorized
      if (selectedCategory !== 'all') {
        filtered = categorized.filter(u => {
          if (u.role === 'MANAGER') return true
          return u.category === selectedCategory
        })
      }

      const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']
      const emojis = { ADMIN: '👑', MANAGER: '👔', STAFF: '👤' }

      setParticipants(filtered.map((u, i) => ({
        name: u.name || 'Bilinmeyen',
        color: colors[i % colors.length],
        emoji: emojis[u.role] || '👤',
        role: u.role === 'ADMIN' ? 'Yönetici' : u.role === 'MANAGER' ? 'Müdür' : 'Personel',
        category: u.category
      })))
    } catch (error) { console.error(error) }
  }

  const getStoreName = (storeId) => {
    const store = stores.find(s => s.id === storeId)
    return store ? store.name : 'Mağazasız'
  }

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
        await updateDoc(doc(db, 'lottery', activeLottery.id), {
          winner: winner.name, activatedAt: nowDate.toISOString(), isActive: true,
          category: selectedCategory
        })
      } else {
        await addDoc(collection(db, 'lottery'), {
          date: todayStr, winner: winner.name, activatedAt: nowDate.toISOString(),
          expiresAt: midnight.toISOString(), isActive: true, createdBy: user.name || user.email,
          category: selectedCategory
        })
      }
      fetchActiveLottery()
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const handleEnd = async () => {
    try {
      if (activeLottery) {
        await updateDoc(doc(db, 'lottery', activeLottery.id), { isActive: false })
        setActiveLottery(null)
      }
    } catch (error) { toast.error('Hata: ' + error.message) }
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

      {/* Kategori Filtresi */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '16px' }}>🏷️</span>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>Kategori Seçin</h3>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button onClick={() => setSelectedCategory('all')} style={{
            padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '13px', fontWeight: '600',
            border: selectedCategory === 'all' ? '2px solid #8b5cf6' : '1px solid #475569',
            backgroundColor: selectedCategory === 'all' ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
            color: selectedCategory === 'all' ? '#c4b5fd' : '#94a3b8',
            cursor: 'pointer', transition: 'all 0.2s ease'
          }}>👥 Tümü ({participants.length})</button>
          {[
            { name: 'Giriş kat', icon: '🚪', color: '#3b82f6' },
            { name: 'Züccaciye', icon: '🍳', color: '#8b5cf6' },
            { name: 'Kasa', icon: '🗄️', color: '#10b981' },
            { name: 'Mobilya', icon: '🛋️', color: '#f59e0b' }
          ].map(cat => {
            const count = participants.filter(p => p.category === cat.name).length
            return (
              <button key={cat.name} onClick={() => setSelectedCategory(cat.name)} style={{
                padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '13px', fontWeight: '600',
                border: selectedCategory === cat.name ? `2px solid ${cat.color}` : '1px solid #475569',
                backgroundColor: selectedCategory === cat.name ? `${cat.color}20` : 'transparent',
                color: selectedCategory === cat.name ? cat.color : '#94a3b8',
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}>{cat.icon} {cat.name} ({count})</button>
            )
          })}
        </div>
      </div>

      {/* Çekiliş Çarkı */}
      <div className="card">
        <LotteryWheel onWinner={handleConfirm} participants={participants} />
      </div>

      {/* Katılımcılar */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>👥 Katılımcılar ({participants.length})</h3>
          {selectedCategory !== 'all' && (
            <span style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: '600', padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: 'rgba(139, 92, 246, 0.15)' }}>
              {selectedCategory}
            </span>
          )}
        </div>
        {participants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '14px' }}>
            Bu kategoride katılımcı bulunmuyor
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {participants.map(p => {
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
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: p.color }}>{p.role} • {p.category}</div>
                  </div>
                  {isWinner && <div style={{ marginLeft: 'auto', fontSize: '16px' }}>🏆</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
