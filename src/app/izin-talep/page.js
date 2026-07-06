'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/components/Toast'

const LEAVE_TYPES = [
  { value: 'annual', label: '📅 Yıllık İzin', color: '#3b82f6' },
  { value: 'sick', label: '🤒 Sağlık İzni', color: '#ef4444' },
  { value: 'personal', label: '👤 Kişisel İzin', color: '#8b5cf6' },
  { value: 'other', label: '📋 Diğer', color: '#64748b' }
]

const STATUS_CONFIG = {
  pending: { label: 'Beklemede', color: '#f59e0b', icon: '⏳' },
  approved: { label: 'Onaylandı', color: '#10b981', icon: '✅' },
  rejected: { label: 'Reddedildi', color: '#ef4444', icon: '❌' }
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export default function IzinTalepPage() {
  const { user } = useAuth()
  const toast = useToast()
  const canManage = user && (user.role === 'ADMIN' || user.role === 'MANAGER')

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState('new')
  const [rejectNote, setRejectNote] = useState('')
  const [rejectingId, setRejectingId] = useState(null)
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())

  // Form
  const [formData, setFormData] = useState({
    type: 'annual',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: ''
  })

  useEffect(() => {
    if (!user) return
    const q = canManage
      ? query(collection(db, 'leaveRequests'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'leaveRequests'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user, canManage])

  const handleSubmitRequest = async (e) => {
    e.preventDefault()
    if (!formData.reason.trim()) { toast.warning('Lütfen bir sebep yazın!'); return }
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    if (end < start) { toast.error('Bitiş tarihi başlangıçtan önce olamaz!'); return }

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1

    try {
      await addDoc(collection(db, 'leaveRequests'), {
        userId: user.uid,
        userName: user.name || user.email,
        userRole: user.role,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days,
        reason: formData.reason.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      })
      setFormData({ type: 'annual', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], reason: '' })
      setShowForm(false)
      toast.success(`İzin talebi gönderildi! (${days} gün)`)
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const handleApprove = async (id) => {
    try {
      await updateDoc(doc(db, 'leaveRequests', id), {
        status: 'approved',
        reviewedBy: user.name || user.email,
        reviewedAt: new Date().toISOString()
      })
      toast.success('İzin onaylandı!')
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const handleReject = async (id) => {
    try {
      await updateDoc(doc(db, 'leaveRequests', id), {
        status: 'rejected',
        reviewedBy: user.name || user.email,
        reviewedAt: new Date().toISOString(),
        rejectNote: rejectNote.trim()
      })
      setRejectingId(null)
      setRejectNote('')
      toast.warning('İzin reddedildi!')
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const getLeaveDaysInRange = (start, end, year, month) => {
    const rangeStart = new Date(year, month, 1)
    const rangeEnd = new Date(year, month + 1, 0)
    const leaveStart = new Date(start)
    const leaveEnd = new Date(end)
    if (leaveEnd < rangeStart || leaveStart > rangeEnd) return 0
    const effectiveStart = leaveStart < rangeStart ? rangeStart : leaveStart
    const effectiveEnd = leaveEnd > rangeEnd ? rangeEnd : leaveEnd
    return Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const processedRequests = requests.filter(r => r.status !== 'pending')
  const myPending = requests.filter(r => r.userId === user.uid && r.status === 'pending')
  const myProcessed = requests.filter(r => r.userId === user.uid && r.status !== 'pending')
  const myUsedDays = myProcessed.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.days || 0), 0)

  // Takvim için
  const calendarDays = new Date(calYear, calMonth + 1, 0).getDate()
  const firstDayOfWeek = (new Date(calYear, calMonth, 1).getDay() + 6) % 7
  const approvedLeaves = requests.filter(r => r.status === 'approved')

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div>🔑 Giriş yapın</div></div>
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>📅 İzin Talep</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>İzin taleplerinizi oluşturun ve takip edin</p>
      </div>

      {/* Tab Menüsü */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { key: 'new', label: '📝 Yeni Talep', color: '#10b981' },
          { key: 'my', label: `📋 Taleplerim (${myPending.length})`, color: '#3b82f6' },
          ...(canManage ? [{ key: 'pending', label: `⏳ Onay Bekleyen (${pendingRequests.length})`, color: '#f59e0b' }] : []),
          { key: 'calendar', label: '📅 Takvim', color: '#8b5cf6' }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '13px', fontWeight: '600',
            border: `2px solid ${activeTab === tab.key ? tab.color : '#334155'}`,
            backgroundColor: activeTab === tab.key ? `${tab.color}20` : 'transparent',
            color: activeTab === tab.key ? tab.color : '#94a3b8',
            cursor: 'pointer', transition: 'all 0.2s ease'
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Yeni İzin Talebi */}
      {activeTab === 'new' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>📝 Yeni İzin Talebi</h3>
            <div style={{ padding: '0.375rem 0.75rem', borderRadius: '9999px', fontSize: '12px', fontWeight: '600', backgroundColor: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>
              Kullanılan: {myUsedDays} gün
            </div>
          </div>

          {/* İzin Türleri */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {LEAVE_TYPES.map(t => (
              <button key={t.value} onClick={() => setFormData(p => ({ ...p, type: t.value }))} style={{
                padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '12px', fontWeight: '600',
                border: `2px solid ${formData.type === t.value ? t.color : '#334155'}`,
                backgroundColor: formData.type === t.value ? `${t.color}20` : 'transparent',
                color: formData.type === t.value ? t.color : '#94a3b8',
                cursor: 'pointer', transition: 'all 0.2s ease'
              }}>{t.label}</button>
            ))}
          </div>

          <form onSubmit={handleSubmitRequest}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">📅 Başlangıç</label>
                <input type="date" value={formData.startDate} onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))} required className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">📅 Bitiş</label>
                <input type="date" value={formData.endDate} onChange={(e) => setFormData(p => ({ ...p, endDate: e.target.value }))} required className="form-input" />
              </div>
            </div>

            {formData.startDate && formData.endDate && new Date(formData.endDate) >= new Date(formData.startDate) && (
              <div style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(59,130,246,0.1)', marginBottom: '0.75rem', fontSize: '13px', color: '#93c5fd' }}>
                📊 Toplam: <strong>{Math.ceil((new Date(formData.endDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24)) + 1}</strong> gün
              </div>
            )}

            <div className="form-group">
              <label className="form-label">📝 Sebep</label>
              <textarea value={formData.reason} onChange={(e) => setFormData(p => ({ ...p, reason: e.target.value }))}
                placeholder="İzin sebebinizi yazın..." required className="form-input" rows={3} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>📨 Gönder</button>
          </form>
        </div>
      )}

      {/* Taleplerim */}
      {activeTab === 'my' && (
        <div className="space-y-3">
          {myPending.length > 0 && (
            <>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b' }}>⏳ Bekleyen Taleplerim</h3>
              {myPending.map(req => {
                const t = LEAVE_TYPES.find(l => l.value === req.type) || LEAVE_TYPES[3]
                const s = STATUS_CONFIG[req.status]
                return (
                  <div key={req.id} className="card" style={{ borderLeft: `4px solid ${t.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{t.label}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.25rem' }}>
                          📅 {req.startDate} → {req.endDate} ({req.days} gün)
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>📝 {req.reason}</div>
                      </div>
                      <span style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '11px', fontWeight: '600', backgroundColor: `${s.color}20`, color: s.color }}>
                        {s.icon} {s.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginTop: myPending.length > 0 ? '1rem' : 0 }}>📋 İşlenen Taleplerim ({myProcessed.length})</h3>
          {myProcessed.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <div style={{ color: '#64748b', fontSize: '13px' }}>Henüz işlenmiş talep yok</div>
            </div>
          ) : myProcessed.map(req => {
            const t = LEAVE_TYPES.find(l => l.value === req.type) || LEAVE_TYPES[3]
            const s = STATUS_CONFIG[req.status]
            return (
              <div key={req.id} className="card" style={{ borderLeft: `4px solid ${s.color}`, opacity: 0.85 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{t.label}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>📅 {req.startDate} → {req.endDate} ({req.days} gün)</div>
                    {req.rejectNote && <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '0.25rem' }}>💬 {req.rejectNote}</div>}
                  </div>
                  <span style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '11px', fontWeight: '600', backgroundColor: `${s.color}20`, color: s.color }}>
                    {s.icon} {s.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Onay Bekleyenler (Admin/Müdür) */}
      {activeTab === 'pending' && canManage && (
        <div className="space-y-3">
          {pendingRequests.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '48px', marginBottom: '0.75rem' }}>✅</div>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Bekleyen izin talebi yok</p>
            </div>
          ) : pendingRequests.map(req => {
            const t = LEAVE_TYPES.find(l => l.value === req.type) || LEAVE_TYPES[3]
            const isRejecting = rejectingId === req.id
            return (
              <div key={req.id} className="card" style={{ borderLeft: `4px solid ${t.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>
                      {t.label} — {req.userName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.25rem' }}>
                      📅 {req.startDate} → {req.endDate} ({req.days} gün)
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>📝 {req.reason}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {!isRejecting ? (
                    <>
                      <button onClick={() => handleApprove(req.id)} style={{
                        flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px', fontWeight: '600',
                        background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', cursor: 'pointer'
                      }}>✅ Onayla</button>
                      <button onClick={() => setRejectingId(req.id)} style={{
                        flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px', fontWeight: '600',
                        backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', cursor: 'pointer'
                      }}>❌ Reddet</button>
                    </>
                  ) : (
                    <div style={{ width: '100%' }}>
                      <input type="text" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Ret sebebi (isteğe bağlı)" className="form-input" style={{ fontSize: '12px', padding: '0.5rem', marginBottom: '0.5rem' }} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleReject(req.id)} style={{
                          flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px', fontWeight: '600',
                          background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer'
                        }}>Onayla Ret</button>
                        <button onClick={() => { setRejectingId(null); setRejectNote('') }} style={{
                          flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px',
                          backgroundColor: '#334155', color: '#94a3b8', border: 'none', cursor: 'pointer'
                        }}>İptal</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Takvim */}
      {activeTab === 'calendar' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }} style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#334155', color: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: '600'
            }}>⬅️</button>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>{MONTH_NAMES[calMonth]} {calYear}</h3>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }} style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#334155', color: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: '600'
            }}>➡️</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#94a3b8', padding: '0.375rem' }}>{d}</div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: calendarDays }).map((_, i) => {
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              const leavesToday = approvedLeaves.filter(l => {
                const s = new Date(l.startDate); const e = new Date(l.endDate)
                const d = new Date(dateStr)
                return d >= s && d <= e
              })
              return (
                <div key={i} style={{
                  textAlign: 'center', padding: '0.375rem', borderRadius: '0.5rem', fontSize: '12px',
                  backgroundColor: isToday ? 'rgba(59,130,246,0.2)' : leavesToday.length > 0 ? 'rgba(245,158,11,0.15)' : '#0f172a',
                  border: isToday ? '2px solid #3b82f6' : '1px solid #334155', minHeight: '36px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ fontWeight: isToday ? '700' : '400', color: isToday ? '#3b82f6' : '#f8fafc' }}>{i + 1}</div>
                  {leavesToday.length > 0 && (
                    <div style={{ fontSize: '8px', color: '#f59e0b', fontWeight: '600', lineHeight: 1.2 }}>
                      {leavesToday.length} izin
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Takvim Legend */}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '11px', color: '#94a3b8' }}>
            <span>🔵 Bugün</span>
            <span>🟡 İzinli kişi var</span>
            <span>⬜ Normal gün</span>
          </div>

          {/* İzindeki Kişiler */}
          {approvedLeaves.filter(l => {
            const today = new Date()
            const s = new Date(l.startDate); const e = new Date(l.endDate)
            return today >= s && today <= e
          }).length > 0 && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#f59e0b', marginBottom: '0.5rem' }}>📍 Şu An İzinde Olanlar</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {approvedLeaves.filter(l => {
                  const today = new Date()
                  const s = new Date(l.startDate); const e = new Date(l.endDate)
                  return today >= s && today <= e
                }).map(l => {
                  const t = LEAVE_TYPES.find(x => x.value === l.type) || LEAVE_TYPES[3]
                  return (
                    <span key={l.id} style={{
                      padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '11px', fontWeight: '600',
                      backgroundColor: `${t.color}20`, color: t.color, border: `1px solid ${t.color}30`
                    }}>{l.userName} — {t.label} ({l.endDate}'e kadar)</span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
