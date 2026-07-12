'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore'
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
  const [pendingCount, setPendingCount] = useState(0)
  const prevPendingRef = useRef(0)

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })

  useEffect(() => {
    if (!user) return
    const isAdmin = ['ADMIN', 'MANAGER'].includes(user.role)
    const q = isAdmin
      ? query(collection(db, 'breaks'), where('date', '==', today))
      : query(collection(db, 'breaks'), where('userId', '==', user.uid), where('date', '==', today))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      setBreaks(list)
      const active = list.find(b => b.status === 'approved' && !b.endTime)
      setActiveBreak(active || null)
      setPendingCount(list.filter(b => b.status === 'pending').length)
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
    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) return
    if (pendingCount > prevPendingRef.current && pendingCount > 0) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.type = 'square'
          osc.frequency.value = 800
          gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.25)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + 0.2)
          osc.start(ctx.currentTime + i * 0.25)
          osc.stop(ctx.currentTime + i * 0.25 + 0.2)
        }
      } catch (e) {}
    }
    prevPendingRef.current = pendingCount
  }, [pendingCount, user])

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
    }
  }, [elapsed, activeBreak, toast])

  const usedBreaks = breaks.filter(b => b.status === 'approved' || b.status === 'completed' || b.status === 'pending')
  const getUsedCount = (typeId) => usedBreaks.filter(b => b.breakType === typeId).length

  const requestBreak = async (typeId) => {
    if (activeBreak) { toast('Zaten aktif bir molanız var!', 'error'); return }
    const bt = BREAK_TYPES.find(b => b.id === typeId)
    const used = getUsedCount(typeId)
    if (used >= bt.maxDaily) { toast(`Bugün ${bt.maxDaily} ${bt.label} hakkınız dolmuş!`, 'error'); return }

    const pending = breaks.find(b => b.breakType === typeId && b.status === 'pending')
    if (pending) { toast('Bu türde bekleyen bir talebiniz var!', 'error'); return }

    await addDoc(collection(db, 'breaks'), {
      userId: user.uid,
      userName: user.name || user.email,
      breakType: typeId,
      duration: bt.duration,
      date: today,
      status: 'pending',
      startTime: null,
      endTime: null,
      createdAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null
    })
    toast(`${bt.icon} ${bt.label} talebiniz gönderildi!`, 'success')
  }

  const cancelBreak = async (breakId) => {
    await deleteDoc(doc(db, 'breaks', breakId))
    toast('Mola talebi iptal edildi', 'info')
  }

  if (!user) return null

  const isAdmin = ['ADMIN', 'MANAGER'].includes(user.role)

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}d ${s < 10 ? '0' : ''}${s}s`
  }

  const formatRemaining = (elapsed, total) => {
    const remaining = Math.max(0, total - elapsed)
    const m = Math.floor(remaining / 60)
    const s = remaining % 60
    return `${m}d ${s < 10 ? '0' : ''}${s}s`
  }

  const totalApprovedBreaks = breaks.filter(b => b.status === 'approved' || b.status === 'completed')
  const totalMinutes = Math.floor(totalApprovedBreaks.reduce((sum, b) => sum + (b.duration || 0), 0) / 60)

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>☕ Ekip Molası</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
          {isAdmin ? 'Gelen talepleri yönetin' : 'Mola taleplerinizi yönetin'}
          {pendingCount > 0 && isAdmin && <span style={{ marginLeft: '0.5rem', backgroundColor: '#ef4444', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '12px' }}>{pendingCount} bekliyor</span>}
        </p>
      </div>

      {/* Aktif Mola Sayaçı */}
      {activeBreak && (
        <div className="card" style={{ marginTop: '1rem', border: '2px solid rgba(245,158,11,0.3)', background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))' }}>
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            {(() => { const bt = BREAK_TYPES.find(b => b.id === activeBreak.breakType); return bt ? bt.icon : '☕' })()}
            <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '0.5rem' }}>
              {(() => { const bt = BREAK_TYPES.find(b => b.id === activeBreak.breakType); return bt ? bt.label : 'Mola' })()} — Onaylandı
            </div>
            <div style={{ fontSize: '42px', fontWeight: '800', color: '#f59e0b', fontFamily: 'monospace', margin: '0.75rem 0' }}>
              {formatDuration(elapsed)}
            </div>
            {(() => {
              const bt = BREAK_TYPES.find(b => b.id === activeBreak.breakType)
              if (!bt) return null
              const remaining = Math.max(0, bt.duration - elapsed)
              const pct = Math.min(100, (elapsed / bt.duration) * 100)
              return (
                <div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '0.5rem' }}>
                    Kalan süre: <strong style={{ color: remaining < 60 ? '#ef4444' : '#10b981' }}>{formatRemaining(elapsed, bt.duration)}</strong>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden', marginTop: '0.5rem' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: pct > 80 ? '#ef4444' : '#f59e0b', borderRadius: '4px', transition: 'width 1s' }} />
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Mola Talep Et */}
      {!activeBreak && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>🕐 Mola Talep Et</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {BREAK_TYPES.map(bt => {
              const used = getUsedCount(bt.id)
              const remaining = bt.maxDaily - used
              const hasPending = breaks.some(b => b.breakType === bt.id && b.status === 'pending')
              const disabled = remaining <= 0 || hasPending
              return (
                <button key={bt.id} onClick={() => requestBreak(bt.id)} disabled={disabled} style={{
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
                  <div style={{ fontSize: '12px', color: remaining > 0 ? bt.color : '#ef4444', marginTop: '0.5rem', fontWeight: '600' }}>
                    {hasPending ? '⏳ Bekliyor' : remaining > 0 ? `Kalan: ${remaining}/${bt.maxDaily}` : 'Hak dolmuş'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Bugünkü Özet */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>{totalApprovedBreaks.length}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Toplam Mola</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b' }}>{totalMinutes} dk</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Toplam Süre</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#06b6d4' }}>{pendingCount}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Bekleyen Talep</div>
        </div>
      </div>

      {/* Yönetici: Bekleyen Talepler */}
      {isAdmin && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>🔔 Bekleyen Talepler</h3>
          {breaks.filter(b => b.status === 'pending').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Bekleyen talep yok</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {breaks.filter(b => b.status === 'pending').map(b => {
                const bt = BREAK_TYPES.find(t => t.id === b.breakType)
                return (
                  <MolaRequest key={b.id} breakData={b} breakType={bt} user={user} toast={toast} />
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Mola Listesi */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>
          {isAdmin ? '📋 Bugünkü Tüm Molalar' : '📋 Bugünkü Molalarım'}
        </h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Yükleniyor...</div>
        ) : breaks.filter(b => b.status !== 'pending').length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Bugün mola kaydı yok</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {breaks.filter(b => b.status !== 'pending').map(b => {
              const bt = BREAK_TYPES.find(t => t.id === b.breakType)
              const statusColors = { approved: '#10b981', completed: '#3b82f6', rejected: '#ef4444', cancelled: '#64748b' }
              const statusLabels = { approved: 'Onaylandı', completed: 'Tamamlandı', rejected: 'Reddedildi', cancelled: 'İptal' }
              return (
                <div key={b.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 1rem', borderRadius: '0.75rem',
                  backgroundColor: '#0f172a', border: '1px solid #334155'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '20px' }}>{bt ? bt.icon : '☕'}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>
                        {b.userName} — {bt ? bt.label : 'Mola'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {b.startTime ? new Date(b.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }) : ''}
                        {b.endTime ? ` → ${new Date(b.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}` : ''}
                        {b.duration ? ` (${Math.floor(b.duration / 60)} dk)` : ''}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '12px', fontWeight: '600',
                    color: statusColors[b.status] || '#94a3b8',
                    padding: '0.25rem 0.75rem', borderRadius: '9999px',
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
    </div>
  )
}

function MolaRequest({ breakData, breakType, user, toast }) {
  const [processing, setProcessing] = useState(false)

  const handleApprove = async () => {
    setProcessing(true)
    await updateDoc(doc(db, 'breaks', breakData.id), {
      status: 'approved',
      startTime: new Date().toISOString(),
      approvedBy: user.name || user.email,
      approvedAt: new Date().toISOString()
    })
    toast(`${breakType.icon} ${breakData.userName} molası onaylandı!`, 'success')
    setProcessing(false)
  }

  const handleReject = async () => {
    setProcessing(true)
    await updateDoc(doc(db, 'breaks', breakData.id), {
      status: 'rejected',
      approvedBy: user.name || user.email,
      approvedAt: new Date().toISOString()
    })
    toast(`${breakData.userName} molası reddedildi`, 'info')
    setProcessing(false)
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.75rem 1rem', borderRadius: '0.75rem',
      backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '20px' }}>{breakType ? breakType.icon : '☕'}</span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{breakData.userName}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>{breakType ? `${breakType.label} — ${breakType.duration >= 3600 ? '1 saat' : '15 dk'}` : 'Mola'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={handleReject} disabled={processing} style={{
          padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '13px', fontWeight: '600',
          border: 'none', cursor: processing ? 'not-allowed' : 'pointer',
          backgroundColor: 'rgba(239,68,68,0.2)', color: '#ef4444'
        }}>
          ❌ Reddet
        </button>
        <button onClick={handleApprove} disabled={processing} style={{
          padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '13px', fontWeight: '600',
          border: 'none', cursor: processing ? 'not-allowed' : 'pointer',
          backgroundColor: 'rgba(16,185,129,0.2)', color: '#10b981'
        }}>
          ✅ Onayla
        </button>
      </div>
    </div>
  )
}
