'use client'

import { useState, useEffect } from 'react'
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
  const [myBreaks, setMyBreaks] = useState([])
  const [allBreaks, setAllBreaks] = useState([])
  const [activeBreak, setActiveBreak] = useState(null)
  const [selectedType, setSelectedType] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(true)

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })
  const isAdmin = ['ADMIN', 'MANAGER'].includes(user?.role)

  useEffect(() => {
    if (!user) return
    const qMy = query(collection(db, 'breaks'), where('userId', '==', user.uid), where('date', '==', today))
    const unsubMy = onSnapshot(qMy, (snap) => {
      const valid = ['active', 'sent', 'completed']
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => valid.includes(b.status)).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      setMyBreaks(list)
      const active = list.find(b => b.status === 'active' || b.status === 'sent')
      setActiveBreak(active || null)
      setLoading(false)
    }, () => setLoading(false))

    let unsubAll = null
    if (isAdmin) {
      const qAll = query(collection(db, 'breaks'), where('date', '==', today))
      unsubAll = onSnapshot(qAll, (snap) => {
        const valid = ['active', 'sent', 'completed']
        setAllBreaks(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(b => valid.includes(b.status)).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')))
      }, () => {})
    }

    return () => { unsubMy(); if (unsubAll) unsubAll() }
  }, [user, today, isAdmin])

  useEffect(() => {
    if (!activeBreak || activeBreak.status !== 'sent') { setElapsed(0); return }
    const start = new Date(activeBreak.startTime)
    const tick = () => setElapsed(Math.floor((Date.now() - start.getTime()) / 1000))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [activeBreak])

  useEffect(() => {
    if (!activeBreak || activeBreak.status !== 'sent') return
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
          osc.connect(gain); gain.connect(ctx.destination)
          osc.type = 'sine'; osc.frequency.value = 600 + i * 100
          gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.15)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.25)
          osc.start(ctx.currentTime + i * 0.15)
          osc.stop(ctx.currentTime + i * 0.15 + 0.25)
        }
      } catch (e) {}
    }
  }, [elapsed, activeBreak, toast])

  if (!user) return null

  const getUsedCount = (typeId) => myBreaks.filter(b => b.breakType === typeId).length
  const completedBreaks = myBreaks.filter(b => b.status === 'completed')
  const totalMinutes = Math.floor(completedBreaks.reduce((sum, b) => sum + (b.duration || 0), 0) / 60)

  const selectType = (typeId) => {
    if (activeBreak) { toast('Zaten aktif bir molanız var!', 'error'); return }
    const bt = BREAK_TYPES.find(b => b.id === typeId)
    if (getUsedCount(typeId) >= bt.maxDaily) { toast(`Bugün ${bt.maxDaily} ${bt.label} hakkınız dolmuş!`, 'error'); return }
    setSelectedType(typeId)
  }

  const sendBreak = async () => {
    if (!selectedType) return
    const bt = BREAK_TYPES.find(b => b.id === selectedType)
    await addDoc(collection(db, 'breaks'), {
      userId: user.uid,
      userName: user.name || user.email,
      breakType: selectedType,
      duration: bt.duration,
      date: today,
      status: 'sent',
      startTime: new Date().toISOString(),
      endTime: null,
      createdAt: new Date().toISOString()
    })
    setSelectedType(null)
    toast(`${bt.icon} ${bt.label} gönderildi, sayaç başladı!`, 'success')
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = 880
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(); osc.stop(ctx.currentTime + 0.3)
    } catch (e) {}
  }

  const cancelSelection = () => setSelectedType(null)

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}d ${s < 10 ? '0' : ''}${s}s`
  }

  const activeOnDuty = (isAdmin ? allBreaks : []).filter(b => b.status === 'sent')

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>☕ Ekip Molası</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>{isAdmin ? 'Canlı mola takibi' : 'Mola seç, gönder, sayaç başlasın'}</p>
      </div>

      {/* === AKTİF SAYAÇ (gönderilmiş molalar için) === */}
      {activeBreak && activeBreak.status === 'sent' && activeBreak.userId === user.uid && (
        <div className="card" style={{ marginTop: '1rem', border: `2px solid ${BREAK_TYPES.find(b => b.id === activeBreak.breakType)?.color || '#f59e0b'}` }}>
          {(() => {
            const bt = BREAK_TYPES.find(b => b.id === activeBreak.breakType)
            const remaining = Math.max(0, (bt?.duration || 0) - elapsed)
            const pct = Math.min(100, (elapsed / (bt?.duration || 1)) * 100)
            return (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '48px' }}>{bt?.icon || '☕'}</div>
                <div style={{ fontSize: '16px', color: bt?.color || '#f59e0b', fontWeight: '700', marginTop: '0.5rem' }}>{bt?.label} — Devam Ediyor</div>
                <div style={{ fontSize: '42px', fontWeight: '800', color: '#f8fafc', fontFamily: 'monospace', margin: '0.75rem 0' }}>
                  {formatDuration(elapsed)}
                </div>
                <div style={{ fontSize: '14px', color: remaining < 60 ? '#ef4444' : '#94a3b8' }}>
                  Kalan: <strong style={{ color: remaining < 60 ? '#ef4444' : '#10b981' }}>{formatDuration(remaining)}</strong>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden', margin: '0.75rem 0' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct > 80 ? '#ef4444' : bt?.color || '#f59e0b', borderRadius: '4px', transition: 'width 1s' }} />
                </div>
                <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>✅ Yöneticiler tarafından görünür</div>
              </div>
            )
          })()}
        </div>
      )}

      {/* === ONAY EKRANI (tür seçildi, gönder尚未 basılmadı) === */}
      {selectedType && !activeBreak && (
        <div className="card" style={{ marginTop: '1rem', border: '2px solid #f59e0b', background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))' }}>
          {(() => {
            const bt = BREAK_TYPES.find(b => b.id === selectedType)
            if (!bt) return null
            return (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '56px', marginBottom: '0.75rem' }}>{bt.icon}</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', marginBottom: '0.5rem' }}>{bt.label}</div>
                <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '1.5rem' }}>
                  {bt.duration >= 3600 ? '1 saat' : '15 dakika'} mola — Gönder dediğinde sayaç başlar
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                  <button onClick={cancelSelection} style={{
                    padding: '0.875rem 2rem', borderRadius: '0.75rem', fontSize: '15px', fontWeight: '600',
                    border: '2px solid #475569', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer'
                  }}>
                    ❌ İptal
                  </button>
                  <button onClick={sendBreak} style={{
                    padding: '0.875rem 2.5rem', borderRadius: '0.75rem', fontSize: '15px', fontWeight: '700',
                    border: 'none', cursor: 'pointer',
                    background: `linear-gradient(135deg, ${bt.color}, ${bt.color}cc)`, color: '#fff',
                    boxShadow: `0 4px 12px ${bt.color}66`
                  }}>
                    📤 Gönder
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* === MOLA TÜRÜ SEÇ === */}
      {!selectedType && !activeBreak && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>🕐 Mola Türü Seç</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {BREAK_TYPES.map(bt => {
              const used = getUsedCount(bt.id)
              const remaining = bt.maxDaily - used
              const disabled = remaining <= 0
              return (
                <button key={bt.id} onClick={() => selectType(bt.id)} disabled={disabled} style={{
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

      {/* === ÖZET === */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>{completedBreaks.length}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Tamamlanan Mola</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b' }}>{totalMinutes} dk</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Toplam Süre</div>
        </div>
      </div>

      {/* === YÖNETİCİ: Canlı Molalar === */}
      {isAdmin && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>
            📡 Molada Olanlar <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: '400' }}>({activeOnDuty.length} kişi)</span>
          </h3>
          {activeOnDuty.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Şu an molada olan yok</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {activeOnDuty.map(b => {
                const bt = BREAK_TYPES.find(t => t.id === b.breakType)
                const start = new Date(b.startTime)
                const startStr = start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })
                const nowSec = Math.floor((Date.now() - start.getTime()) / 1000)
                const remaining = Math.max(0, (b.duration || 0) - nowSec)
                const rMin = Math.floor(remaining / 60)
                const rSec = remaining % 60
                return (
                  <div key={b.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1rem', borderRadius: '0.75rem',
                    backgroundColor: `${bt?.color || '#f59e0b'}15`, border: `1px solid ${bt?.color || '#f59e0b'}40`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '22px' }}>{bt?.icon || '☕'}</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{b.userName}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{bt?.label} — Çıkış: {startStr}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: remaining < 60 ? '#ef4444' : bt?.color || '#f59e0b', fontFamily: 'monospace' }}>
                        {rMin}:{rSec < 10 ? '0' : ''}{rSec}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>kalan süre</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* === YÖNETİCİ: Tüm Molalar === */}
      {isAdmin && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📋 Bugünkü Tüm Molalar</h3>
          {allBreaks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Bugün mola kaydı yok</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {allBreaks.map(b => {
                const bt = BREAK_TYPES.find(t => t.id === b.breakType)
                const start = new Date(b.startTime)
                const startStr = start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })
                const isActive = b.status === 'sent'
                return (
                  <div key={b.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1rem', borderRadius: '0.75rem',
                    backgroundColor: isActive ? `${bt?.color || '#f59e0b'}15` : '#0f172a',
                    border: `1px solid ${isActive ? `${bt?.color || '#f59e0b'}40` : '#334155'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '20px' }}>{bt?.icon || '☕'}</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{b.userName}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {bt?.label} — Çıkış: {startStr}
                          {b.endTime && ` → Dönüş: ${new Date(b.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}`}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: '600', padding: '0.25rem 0.75rem', borderRadius: '9999px',
                      color: isActive ? '#f59e0b' : '#3b82f6',
                      backgroundColor: isActive ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)'
                    }}>
                      {isActive ? '🔴 MOLADA' : `✅ ${Math.floor((b.duration || 0) / 60)} dk`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* === PERSONEL: Kendi Molaları === */}
      {!isAdmin && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📋 Bugünkü Molalarım</h3>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Yükleniyor...</div>
          ) : myBreaks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Bugün mola kaydı yok</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {myBreaks.map(b => {
                const bt = BREAK_TYPES.find(t => t.id === b.breakType)
                const start = new Date(b.startTime)
                const startStr = start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })
                const isActive = b.status === 'sent'
                const statusColors = { sent: '#f59e0b', completed: '#3b82f6' }
                const statusLabels = { sent: 'Devam Ediyor', completed: 'Tamamlandı' }
                return (
                  <div key={b.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1rem', borderRadius: '0.75rem',
                    backgroundColor: isActive ? `${statusColors[b.status]}15` : '#0f172a',
                    border: `1px solid ${isActive ? `${statusColors[b.status]}40` : '#334155'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '20px' }}>{bt?.icon || '☕'}</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{bt?.label}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {startStr}
                          {b.endTime && ` → ${new Date(b.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}`}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '11px', fontWeight: '600', padding: '0.25rem 0.75rem', borderRadius: '9999px',
                      color: statusColors[b.status] || '#94a3b8',
                      backgroundColor: `${statusColors[b.status] || '#94a3b8'}20`
                    }}>
                      {statusLabels[b.status] || b.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
