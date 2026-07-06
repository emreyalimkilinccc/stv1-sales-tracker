'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/components/Toast'

const DAYS = [
  { key: 'monday', label: 'Pazartesi', icon: '📌' },
  { key: 'tuesday', label: 'Salı', icon: '📌' },
  { key: 'wednesday', label: 'Çarşamba', icon: '📌' },
  { key: 'thursday', label: 'Perşembe', icon: '📌' },
  { key: 'friday', label: 'Cuma', icon: '📌' },
  { key: 'saturday', label: 'Cumartesi', icon: '📌' },
  { key: 'sunday', label: 'Pazar', icon: '📌' }
]

const DEFAULT_CHECKLIST = [
  'Zemin süpürme ve silme',
  'Tezgah ve raf temizliği',
  'Vitrin camı silme',
  'Kasa alanı düzenleme',
  'Çöp boşaltma',
  'Tuvalet temizliği',
  'Depo düzenleme',
  'Dış cephe süpürme'
]

export default function TemizlikPage() {
  const { user } = useAuth()
  const toast = useToast()
  const canManage = user && (user.role === 'ADMIN' || user.role === 'MANAGER')

  const [allUsers, setAllUsers] = useState([])
  const [schedule, setSchedule] = useState({})
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeDay, setActiveDay] = useState('')
  const [showAssign, setShowAssign] = useState(null)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [weekOffset, setWeekOffset] = useState(0)
  const [checklist, setChecklist] = useState({})
  const [photos, setPhotos] = useState([])
  const [photoPreview, setPhotoPreview] = useState([])
  const fileRef = useRef(null)

  const getWeekRange = (offset) => {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - now.getDay() + 1 + (offset * 7))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
      label: `${monday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} - ${sunday.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}`
    }
  }

  const week = getWeekRange(weekOffset)
  const today = new Date().toISOString().split('T')[0]
  const todayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]?.key

  useEffect(() => {
    if (!user) return
    fetchUsers()
    const unsub = onSnapshot(collection(db, 'cleaningSchedule'), (snap) => {
      const data = {}
      snap.docs.forEach(d => {
        const docData = d.data()
        if (docData.weekStart === week.start) {
          data[docData.day] = { id: d.id, ...docData }
        }
      })
      setSchedule(data)
      setLoading(false)
    })

    const unsub2 = onSnapshot(query(collection(db, 'cleaningCompletions'), where('weekStart', '==', week.start)), (snap) => {
      setCompletions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })

    return () => { unsub(); unsub2() }
  }, [user, week.start])

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
        weekStart: week.start,
        assignedUsers: selectedUsers.map(u => ({ id: u.id, name: u.name, role: u.role, category: u.category || '' })),
        createdBy: user.name || user.email,
        createdAt: new Date().toISOString()
      }

      if (schedule[dayKey]?.id) {
        await updateDoc(doc(db, 'cleaningSchedule', schedule[dayKey].id), dayData)
      } else {
        await addDoc(collection(db, 'cleaningSchedule'), dayData)
      }
      setShowAssign(null)
      setSelectedUsers([])
      toast.success(`${DAYS.find(d => d.key === dayKey).label} güncellendi!`)
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const handleToggleUser = (u) => {
    setSelectedUsers(prev => {
      const exists = prev.find(p => p.id === u.id)
      if (exists) return prev.filter(p => p.id !== u.id)
      if (prev.length >= 3) { toast.warning('En fazla 3 kişi seçebilirsiniz!'); return prev }
      return [...prev, u]
    })
  }

  const handleChecklistToggle = (dayKey, item) => {
    setChecklist(prev => {
      const dayItems = prev[dayKey] || []
      if (dayItems.includes(item)) return { ...prev, [dayKey]: dayItems.filter(i => i !== item) }
      return { ...prev, [dayKey]: [...dayItems, item] }
    })
  }

  const compressImage = (file) => {
    return new Promise((resolve) => {
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
  }

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (photos.length + files.length > 5) { toast.warning('En fazla 5 fotoğraf yükleyebilirsiniz!'); return }
    const compressed = await Promise.all(files.map(f => compressImage(f)))
    setPhotos(prev => [...prev, ...compressed])
    setPhotoPreview(prev => [...prev, ...compressed.map(() => true)])
  }

  const handleRemovePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
    setPhotoPreview(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmitCleaning = async (dayKey) => {
    const dayChecklist = checklist[dayKey] || []
    if (dayChecklist.length === 0) { toast.warning('En az 1 görev tamamlayın!'); return }

    try {
      await addDoc(collection(db, 'cleaningCompletions'), {
        day: dayKey,
        weekStart: week.start,
        userId: user.uid,
        userName: user.name || user.email,
        completedItems: dayChecklist,
        photos: photos,
        completedAt: new Date().toISOString()
      })
      setChecklist(prev => ({ ...prev, [dayKey]: [] }))
      setPhotos([])
      toast.success('Temizlik kaydedildi! ✅')
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const handleDeleteAssignment = async (dayKey) => {
    if (!confirm('Bu günün atamasını silmek istediğinize emin misiniz?')) return
    try {
      if (schedule[dayKey]?.id) {
        await deleteDoc(doc(db, 'cleaningSchedule', schedule[dayKey].id))
        toast.success('Atama silindi!')
      }
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div>🔑 Lütfen giriş yapın</div></div>
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>🧹 Temizlik Programı</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Haftalık temizlik programı ve takibi</p>
      </div>

      {/* Hafta Seçici */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button onClick={() => setWeekOffset(w => w - 1)} style={{
          padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#334155', color: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: '600'
        }}>⬅️ Önceki Hafta</button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{week.label}</div>
          {weekOffset === 0 && <div style={{ fontSize: '11px', color: '#10b981', fontWeight: '600' }}>Bu hafta</div>}
        </div>
        <button onClick={() => setWeekOffset(w => w + 1)} style={{
          padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#334155', color: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: '600'
        }}>Sonraki Hafta ➡️</button>
      </div>

      {/* Günler */}
      <div className="space-y-3">
        {DAYS.map(day => {
          const assigned = schedule[day.key]?.assignedUsers || []
          const dayCompletions = completions.filter(c => c.day === day.key)
          const isToday = todayKey === day.key && weekOffset === 0
          const isMyDay = assigned.some(a => a.id === user.uid)
          const myCompletion = dayCompletions.find(c => c.userId === user.uid)

          return (
            <div key={day.key} className="card" style={{
              borderLeft: `4px solid ${isToday ? '#10b981' : '#334155'}`,
              opacity: isToday ? 1 : 0.85
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '16px' }}>{day.icon}</span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: isToday ? '#10b981' : '#f8fafc' }}>
                    {day.label}
                  </span>
                  {isToday && <span style={{ fontSize: '10px', backgroundColor: '#10b981', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: '600' }}>BUGÜN</span>}
                  {myCompletion && <span style={{ fontSize: '10px', backgroundColor: '#10b981', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: '600' }}>✅ Tamamlandı</span>}
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
                  {assigned.map(a => (
                    <span key={a.id} style={{
                      padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '11px', fontWeight: '600',
                      backgroundColor: a.id === user.uid ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.15)',
                      color: a.id === user.uid ? '#10b981' : '#93c5fd',
                      border: `1px solid ${a.id === user.uid ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`
                    }}>
                      {a.category ? `${a.category} - ` : ''}{a.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '0.5rem' }}>Henüz atama yapılmamış</div>
              )}

              {/* Kişisel Görünüm — CheckedList + Foto */}
              {(isMyDay || isToday) && weekOffset === 0 && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '0.75rem', border: '1px solid #334155' }}>
                  {!myCompletion ? (
                    <>
                      {/* CheckedList */}
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>✅ Görev Kontrol Listesi</div>
                      {DEFAULT_CHECKLIST.map(item => (
                        <label key={item} style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0',
                          fontSize: '13px', color: (checklist[day.key] || []).includes(item) ? '#10b981' : '#94a3b8',
                          cursor: 'pointer'
                        }}>
                          <input type="checkbox" checked={(checklist[day.key] || []).includes(item)}
                            onChange={() => handleChecklistToggle(day.key, item)}
                            style={{ width: '16px', height: '16px', accentColor: '#10b981' }} />
                          <span style={{ textDecoration: (checklist[day.key] || []).includes(item) ? 'line-through' : 'none' }}>{item}</span>
                        </label>
                      ))}

                      {/* Fotoğraf Yükleme */}
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>📷 Fotoğraf Kanıtı</div>
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
                        <div style={{ fontSize: '11px', color: '#64748b' }}>En fazla 5 fotoğraf (sıkıştırılmış)</div>
                      </div>

                      {/* Gönder */}
                      <button onClick={() => handleSubmitCleaning(day.key)} style={{
                        width: '100%', marginTop: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem',
                        background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                        border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
                      }}>✅ Temizliği Tamamla</button>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                      <div style={{ fontSize: '24px', marginBottom: '0.375rem' }}>✅</div>
                      <div style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>Bu günün temizliği tamamlanmış</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '0.25rem' }}>
                        {myCompletion.completedItems.length} görev • {myCompletion.photos?.length || 0} fotoğraf
                      </div>
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
                    }}>
                      ✅ {c.userName} ({c.completedItems.length} görev, {c.photos?.length || 0} foto)
                    </span>
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
                          border: `1px solid ${isSelected ? '#10b981' : '#334155'}`,
                          cursor: 'pointer', transition: 'all 0.2s ease'
                        }}>
                          {u.category ? `${u.category.split(' ')[0]} - ` : ''}{u.name}
                        </button>
                      )
                    })}
                  </div>
                  <button onClick={() => handleSaveAssignment(day.key)} style={{
                    width: '100%', padding: '0.625rem', borderRadius: '0.5rem',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
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
