'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/components/Toast'

const BREAK_TYPES = [
  { id: 'yemek', label: 'Yemek Molası', icon: '🍽️', duration: 3600, color: '#10b981', maxDaily: 1 },
  { id: 'cay', label: 'Çay Molası', icon: '☕', duration: 900, color: '#f59e0b', maxDaily: 2 }
]

export default function MolaPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [breaks, setBreaks] = useState([])
  const [activeBreak, setActiveBreak] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })

  useEffect(() => {
    if (!user) return
    const q = query(collection(db, 'breaks'), where('userId', '==', user.uid), where('date', '==', today))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      setBreaks(list)
      const active = list.find(b => b.status === 'active')
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

  useEffect(() => {
    if (!activeBreak) return
    const bt = BREAK_TYPES.find(b => b.id === activeBreak.breakType)
    if (!bt) return
    if (elapsed >= bt.duration) {
      updateDoc(doc(db, 'breaks', activeBreak.id), {
        endTime: new Date().toISOString(),
        status: 'completed'
      })
      toast('⏰ Mola süreniz doldu, işbaşına dönünüz!', 'warning')
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.type = 'sine'
          osc.frequency.value = 600 + i * 100
          gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.15)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.25)
          osc.start(ctx.currentTime + i * 0.15)
          osc.stop(ctx.currentTime + i * 0.15 + 0.25)
        }
      } catch (e) {}
    }
  }, [elapsed, activeBreak, toast])

  if (!user) return null

  const getUsedCount = (typeId) => breaks.filter(b => b.breakType === typeId && (b.status === 'active' || b.status === 'completed')).length
  const completedBreaks = breaks.filter(b => b.status === 'completed')
  const totalMinutes = Math.floor(completedBreaks.reduce((sum, b) => sum + (b.duration || 0), 0) / 60)

  const startBreak = async (typeId) => {
    if (activeBreak) { toast('Zaten aktif bir molanız var!', 'error'); return }
    const bt = BREAK_TYPES.find(b => b.id === typeId)
    const used = getUsedCount(typeId)
    if (used >= bt.maxDaily) { toast(`Bugün ${bt.maxDaily} ${bt.label} hakkınız dolmuş!`, 'error'); return }

    await addDoc(collection(db, 'breaks'), {
      userId: user.uid,
      userName: user.name || user.email,
      breakType: typeId,
      duration: bt.duration,
      date: today,
      status: 'active',
      startTime: new Date().toISOString(),
      endTime: null,
      createdAt: new Date().toISOString()
    })
    toast(`${bt.icon} ${bt.label} başladı! İyi molalar!`, 'success')
  }

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}d ${s < 10 ? '0' : ''}${s}s`
  }

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>☕ Ekip Molası</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Mola türünü seç, sayaç başlasın</p>
      </div>

      {/* Aktif Mola Sayaçı */}
      {activeBreak && (() => {
        const bt = BREAK_TYPES.find(b => b.id === activeBreak.breakType)
        if (!bt) return null
        const remaining = Math.max(0, bt.duration - elapsed)
        const pct = Math.min(100, (elapsed / bt.duration) * 100)
        return (
          <div className="card" style={{ marginTop: '1rem', border: `2px solid ${bt.color}`, background: `linear-gradient(135deg, ${bt.color}15, ${bt.color}05)` }}>
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ fontSize: '48px' }}>{bt.icon}</div>
              <div style={{ fontSize: '16px', color: bt.color, fontWeight: '700', marginTop: '0.5rem' }}>{bt.label} — Devam Ediyor</div>
              <div style={{ fontSize: '42px', fontWeight: '800', color: '#f8fafc', fontFamily: 'monospace', margin: '0.75rem 0' }}>
                {formatDuration(elapsed)}
              </div>
              <div style={{ fontSize: '14px', color: remaining < 60 ? '#ef4444' : '#94a3b8', marginBottom: '0.5rem' }}>
                Kalan: <strong style={{ color: remaining < 60 ? '#ef4444' : '#10b981' }}>{formatDuration(remaining)}</strong>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden', marginTop: '0.5rem' }}>
                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct > 80 ? '#ef4444' : bt.color, borderRadius: '4px', transition: 'width 1s' }} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* Mola Başlat */}
      {!activeBreak && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>🕐 Mola Başlat</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {BREAK_TYPES.map(bt => {
              const used = getUsedCount(bt.id)
              const remaining = bt.maxDaily - used
              const disabled = remaining <= 0
              return (
                <button key={bt.id} onClick={() => startBreak(bt.id)} disabled={disabled} style={{
                  padding: '1.25rem', borderRadius: '0.75rem', textAlign: 'center',
                  border: `2px solid ${disabled ? '#334155' : bt.color}`,
                  backgroundColor: disabled ? '#0f172a' : `${bt.color}15`,
                  color: disabled ? '#64748b' : bt.color,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '0.5rem' }}>{bt.icon}</div>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>{bt.label}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.25rem' }}>{bt.duration >= 3600 ? '1 saat' : '15 dakika'}</div>
                  <div style={{ fontSize: '12px', color: disabled ? '#ef4444' : bt.color, marginTop: '0.5rem', fontWeight: '600' }}>
                    {disabled ? 'Hak dolmuş' : `Kalan: ${remaining}/${bt.maxDaily}`}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Özet */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>{completedBreaks.length}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Tamamlanan Mola</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b' }}>{totalMinutes} dk</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Toplam Süre</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#06b6d4' }}>{activeBreak ? '1' : '0'}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Aktif Mola</div>
        </div>
      </div>

      {/* Tamamlanan Molalar */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📋 Bugünkü Molalarım</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Yükleniyor...</div>
        ) : breaks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Bugün mola kaydı yok</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {breaks.map(b => {
              const bt = BREAK_TYPES.find(t => t.id === b.breakType)
              const isActive = b.status === 'active'
              const start = new Date(b.startTime)
              const startStr = start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })
              return (
                <div key={b.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 1rem', borderRadius: '0.75rem',
                  backgroundColor: isActive ? `${bt?.color || '#f59e0b'}15` : '#0f172a',
                  border: `1px solid ${isActive ? `${bt?.color || '#f59e0b'}40` : '#334155'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '20px' }}>{bt ? bt.icon : '☕'}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{bt ? bt.label : 'Mola'}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {startStr}
                        {b.endTime && ` → ${new Date(b.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}`}
                        {b.duration ? ` (${Math.floor(b.duration / 60)} dk)` : ''}
                      </div>
                    </div>
                  </div>
                  {isActive ? (
                    <span style={{ fontSize: '12px', fontWeight: '600', color: bt?.color || '#f59e0b', padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: `${bt?.color || '#f59e0b'}20` }}>AKTİF</span>
                  ) : (
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#3b82f6', padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: 'rgba(59,130,246,0.15)' }}>TAMAMLANDI</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
