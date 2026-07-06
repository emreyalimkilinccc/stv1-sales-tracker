'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/components/Toast'

const DEFAULT_CHECKLIST = [
  'Mutfak temizliği',
  'Zemin süpürme ve silme',
  'Çöp boşaltma',
  'Tuvalet temizliği',
  'Teras temizliği',
  'Ortak alan temizliği'
]

const DAY_ICONS = ['📌', '📍', '🔖', '🏷️', '📎', '🎯', '⭐']

export default function TemizlikPage() {
  const { user } = useAuth()
  const toast = useToast()
  const canManage = user && (user.role === 'ADMIN' || user.role === 'MANAGER')

  const [allUsers, setAllUsers] = useState([])
  const [schedules, setSchedules] = useState([])
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAssign, setShowAssign] = useState(null)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [checklist, setChecklist] = useState({})
  const [photos, setPhotos] = useState([])
  const fileRef = useRef(null)

  // Tarih aralığı
  const todayStr = new Date().toISOString().split('T')[0]
  const [dateRange, setDateRange] = useState({
    start: todayStr,
    end: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })

  // Düzenlenebilir günler
  const [days, setDays] = useState([])
  const [editingDay, setEditingDay] = useState(null)
  const [newDayName, setNewDayName] = useState('')
  const [showAddDay, setShowAddDay] = useState(false)

  // Günleri tarih aralığından otomatik oluştur
  useEffect(() => {
    const start = new Date(dateRange.start)
    const end = new Date(dateRange.end)
    const autoDays = []
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
    let d = new Date(start)
    let i = 0
    while (d <= end) {
      autoDays.push({
        key: d.toISOString().split('T')[0],
        date: d.toISOString().split('T')[0],
        label: dayNames[d.getDay()],
        icon: DAY_ICONS[i % DAY_ICONS.length]
      })
      d.setDate(d.getDate() + 1)
      i++
    }
    setDays(autoDays)
  }, [dateRange])

  useEffect(() => {
    if (!user) return
    fetchUsers()
    const unsub = onSnapshot(collection(db, 'cleaningSchedule'), (snap) => {
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    const unsub2 = onSnapshot(collection(db, 'cleaningCompletions'), (snap) => {
      setCompletions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => { unsub(); unsub2() }
  }, [user])

  const fetchUsers = async () => {
    const snap = await getDocs(collection(db, 'user'))
    setAllUsers(snap.docs.filter(d => d.data().role !== 'MANAGER').map(d => ({ id: d.id, ...d.data() })))
  }

  const handleSaveAssignment = async (dayKey) => {
    if (selectedUsers.length === 0) { toast.warning('En az 1 kişi seçin!'); return }
    if (selectedUsers.length > 3) { toast.warning('En fazla 3 kişi seçebilirsiniz!'); return }
    try {
      const dayData = {
        day: dayKey,
        dateRange: `${dateRange.start}_${dateRange.end}`,
        assignedUsers: selectedUsers.map(u => ({ id: u.id, name: u.name, role: u.role, category: u.category || '' })),
        createdBy: user.name || user.email,
        createdAt: new Date().toISOString()
      }
      const existing = schedules.find(s => s.day === dayKey && s.dateRange === `${dateRange.start}_${dateRange.end}`)
      if (existing) {
        await updateDoc(doc(db, 'cleaningSchedule', existing.id), dayData)
      } else {
        await addDoc(collection(db, 'cleaningSchedule'), dayData)
      }
      setShowAssign(null)
      setSelectedUsers([])
      toast.success('Atama kaydedildi!')
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const handleToggleUser = (u) => {
    setSelectedUsers(prev => {
      const exists = prev.find(p => p.id === u.id)
      if (exists) return prev.filter(p => p.id !== u.id)
      if (prev.length >= 3) { toast.warning('En fazla 3 kişi!'); return prev }
      return [...prev, u]
    })
  }

  const handleChecklistToggle = (dayKey, item) => {
    setChecklist(prev => {
      const dayItems = prev[dayKey] || []
      return { ...prev, [dayKey]: dayItems.includes(item) ? dayItems.filter(i => i !== item) : [...dayItems, item] }
    })
  }

  const compressImage = (file) => new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 800
        let w = img.width, h = img.height
        if (w > MAX) { h = (MAX / w) * h; w = MAX }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.6))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (photos.length + files.length > 5) { toast.warning('En fazla 5 fotoğraf!'); return }
    const compressed = await Promise.all(files.map(f => compressImage(f)))
    setPhotos(prev => [...prev, ...compressed])
  }

  const handleRemovePhoto = (idx) => setPhotos(prev => prev.filter((_, i) => i !== idx))

  const handleSubmitCleaning = async (dayKey) => {
    const dayChecklist = checklist[dayKey] || []
    if (dayChecklist.length === 0) { toast.warning('En az 1 görev tamamlayın!'); return }
    try {
      await addDoc(collection(db, 'cleaningCompletions'), {
        day: dayKey, dateRange: `${dateRange.start}_${dateRange.end}`,
        userId: user.uid, userName: user.name || user.email,
        completedItems: dayChecklist, photos: photos,
        completedAt: new Date().toISOString()
      })
      setChecklist(prev => ({ ...prev, [dayKey]: [] }))
      setPhotos([])
      toast.success('Temizlik kaydedildi! ✅')
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const handleDeleteAssignment = async (dayKey) => {
    if (!confirm('Atamayı silmek istediğinize emin misiniz?')) return
    try {
      const existing = schedules.find(s => s.day === dayKey && s.dateRange === `${dateRange.start}_${dateRange.end}`)
      if (existing) {
        await deleteDoc(doc(db, 'cleaningSchedule', existing.id))
        toast.success('Atama silindi!')
      }
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const handleRenameDay = (dayKey) => {
    if (!newDayName.trim()) return
    setDays(prev => prev.map(d => d.key === dayKey ? { ...d, label: newDayName.trim() } : d))
    setEditingDay(null)
    setNewDayName('')
  }

  const todayStr2 = new Date().toISOString().split('T')[0]

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div>🔑 Giriş yapın</div></div>
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>🧹 Temizlik Programı</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Tarih aralığı belirleyin ve kişi atayın</p>
      </div>

      {/* Tarih Aralığı Seçici */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '16px' }}>📅</span>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>Tarih Aralığı</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Başlangıç</label>
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '13px', backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }} />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Bitiş</label>
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '13px', backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }} />
          </div>
        </div>
      </div>

      {/* Günler */}
      <div className="space-y-3">
        {days.map((day, idx) => {
          const daySchedules = schedules.filter(s => s.day === day.key && s.dateRange === `${dateRange.start}_${dateRange.end}`)
          const assigned = daySchedules.flatMap(s => s.assignedUsers || [])
          const dayCompletions = completions.filter(c => c.day === day.key && c.dateRange === `${dateRange.start}_${dateRange.end}`)
          const isToday = day.date === todayStr2
          const isMyDay = assigned.some(a => a.id === user.uid)
          const myCompletion = dayCompletions.find(c => c.userId === user.uid)
          const isPast = day.date < todayStr2
          const hasAssignment = assigned.length > 0
          const isCompleted = dayCompletions.length > 0
          const isNotDone = isPast && hasAssignment && !isCompleted

          return (
            <div key={day.key} className="card" style={{
              borderLeft: `4px solid ${isNotDone ? '#ef4444' : isToday ? '#10b981' : isCompleted ? '#10b981' : '#334155'}`,
              opacity: isPast && !isCompleted ? 1 : (isToday ? 1 : 0.85),
              backgroundColor: isNotDone ? 'rgba(239, 68, 68, 0.05)' : undefined
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '16px' }}>{day.icon}</span>
                  {editingDay === day.key ? (
                    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                      <input type="text" value={newDayName} onChange={(e) => setNewDayName(e.target.value)}
                        style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', fontSize: '13px', backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc', width: '120px' }}
                        placeholder="Gün adı" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleRenameDay(day.key)} />
                      <button onClick={() => handleRenameDay(day.key)} style={{ fontSize: '12px', color: '#10b981', background: 'none', border: 'none', cursor: 'pointer' }}>✓</button>
                      <button onClick={() => setEditingDay(null)} style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '15px', fontWeight: '700', color: isToday ? '#10b981' : '#f8fafc', cursor: 'pointer' }}
                      onClick={() => canManage && setEditingDay(day.key)}>
                      {day.label}
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{day.date}</span>
                  {isToday && <span style={{ fontSize: '10px', backgroundColor: '#10b981', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: '600' }}>BUGÜN</span>}
                  {isNotDone && <span style={{ fontSize: '10px', backgroundColor: '#ef4444', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: '700' }}>❌ YAPILMADI</span>}
                  {isCompleted && !isNotDone && <span style={{ fontSize: '10px', backgroundColor: '#10b981', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: '600' }}>✅ Tamamlandı</span>}
                </div>
                {canManage && (
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button onClick={() => { setShowAssign(showAssign === day.key ? null : day.key); setSelectedUsers(assigned); }} style={{
                      padding: '0.375rem 0.75rem', borderRadius: '0.5rem', fontSize: '11px', fontWeight: '600',
                      backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', cursor: 'pointer'
                    }}>👤 Ata</button>
                    {assigned.length > 0 && (
                      <button onClick={() => handleDeleteAssignment(day.key)} style={{
                        padding: '0.375rem 0.75rem', borderRadius: '0.5rem', fontSize: '11px',
                        backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', cursor: 'pointer'
                      }}>🗑️</button>
                    )}
                  </div>
                )}
              </div>

              {/* Atanan Kişiler */}
              {assigned.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
                  {assigned.map((a, i) => (
                    <span key={i} style={{
                      padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '11px', fontWeight: '600',
                      backgroundColor: a.id === user.uid ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.15)',
                      color: a.id === user.uid ? '#10b981' : '#93c5fd',
                      border: `1px solid ${a.id === user.uid ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`
                    }}>{a.category ? `${a.category} - ` : ''}{a.name}</span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '0.5rem' }}>Atama yapılmamış</div>
              )}

              {/* CheckedList + Foto — Sadece atanan kişi veya bugün */}
              {(isMyDay || isToday) && (
                <div style={{ padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '0.75rem', border: '1px solid #334155' }}>
                  {!myCompletion ? (
                    <>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>✅ Görev Kontrol Listesi</div>
                      {DEFAULT_CHECKLIST.map(item => (
                        <label key={item} style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0',
                          fontSize: '13px', color: (checklist[day.key] || []).includes(item) ? '#10b981' : '#94a3b8', cursor: 'pointer'
                        }}>
                          <input type="checkbox" checked={(checklist[day.key] || []).includes(item)}
                            onChange={() => handleChecklistToggle(day.key, item)}
                            style={{ width: '16px', height: '16px', accentColor: '#10b981' }} />
                          <span style={{ textDecoration: (checklist[day.key] || []).includes(item) ? 'line-through' : 'none' }}>{item}</span>
                        </label>
                      ))}

                      {/* Fotoğraf */}
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>📷 Fotoğraf Kanıtı ({photos.length}/5)</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          {photos.map((p, i) => (
                            <div key={i} style={{ position: 'relative' }}>
                              <img src={p} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '0.5rem', border: '2px solid #334155' }} />
                              <button onClick={() => handleRemovePhoto(i)} style={{
                                position: 'absolute', top: '-5px', right: '-5px', width: '20px', height: '20px',
                                borderRadius: '50%', backgroundColor: '#ef4444', color: '#fff', fontSize: '10px',
                                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>✕</button>
                            </div>
                          ))}
                          {photos.length < 5 && (
                            <button onClick={() => fileRef.current?.click()} style={{
                              width: '80px', height: '80px', borderRadius: '0.5rem', border: '2px dashed #475569',
                              backgroundColor: 'transparent', color: '#94a3b8', fontSize: '24px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>+</button>
                          )}
                          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
                        </div>
                      </div>

                      <button onClick={() => handleSubmitCleaning(day.key)} style={{
                        width: '100%', marginTop: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem',
                        background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                        border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
                      }}>✅ Temizliği Tamamla</button>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                      <div style={{ fontSize: '24px', marginBottom: '0.375rem' }}>✅</div>
                      <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>Tamamlanmış</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{myCompletion.completedItems.length} görev • {myCompletion.photos?.length || 0} foto</div>
                    </div>
                  )}
                </div>
              )}

              {/* Tamamlanan Görevler Özeti */}
              {dayCompletions.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {dayCompletions.map(c => (
                    <span key={c.id} style={{
                      padding: '0.2rem 0.5rem', borderRadius: '0.375rem', fontSize: '10px',
                      backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981',
                      display: 'flex', alignItems: 'center', gap: '0.25rem'
                    }}>✅ {c.userName} ({c.completedItems.length} görev, {c.photos?.length || 0} foto)</span>
                  ))}
                </div>
              )}

              {/* Atama Paneli */}
              {showAssign === day.key && canManage && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '0.75rem', border: '1px solid #10b981' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>
                    👤 Kişi Seçin ({selectedUsers.length}/3)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
                    {allUsers.map(u => {
                      const isSelected = selectedUsers.some(s => s.id === u.id)
                      return (
                        <button key={u.id} onClick={() => handleToggleUser(u)} style={{
                          padding: '0.375rem 0.75rem', borderRadius: '9999px', fontSize: '11px', fontWeight: '600',
                          backgroundColor: isSelected ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.1)',
                          color: isSelected ? '#10b981' : '#93c5fd',
                          border: `1px solid ${isSelected ? '#10b981' : '#334155'}`, cursor: 'pointer'
                        }}>{u.category ? `${u.category.split(' ')[0]} - ` : ''}{u.name}</button>
                      )
                    })}
                  </div>
                  <button onClick={() => handleSaveAssignment(day.key)} style={{
                    width: '100%', padding: '0.625rem', borderRadius: '0.5rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                    border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
                  }}>💾 Kaydet</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
