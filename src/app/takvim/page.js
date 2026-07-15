'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, getDocs, query, where, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/components/Toast'

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

const HOLIDAYS_2026 = [
  { date: '2026-01-01', name: 'Yılbaşı', type: 'resmi' },
  { date: '2026-03-19', name: 'Ramazan Bayramı (1. Gün)', type: 'resmi' },
  { date: '2026-03-20', name: 'Ramazan Bayramı (2. Gün)', type: 'resmi' },
  { date: '2026-03-21', name: 'Ramazan Bayramı (3. Gün)', type: 'resmi' },
  { date: '2026-03-22', name: 'Ramazan Bayramı (4. Gün)', type: 'resmi' },
  { date: '2026-04-23', name: 'Ulusal Egemenlik ve Çocuk Bayramı', type: 'resmi' },
  { date: '2026-05-01', name: 'Emek ve Dayanışma Günü', type: 'resmi' },
  { date: '2026-05-19', name: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', type: 'resmi' },
  { date: '2026-05-25', name: 'Kurban Bayramı (1. Gün)', type: 'resmi' },
  { date: '2026-05-26', name: 'Kurban Bayramı (2. Gün)', type: 'resmi' },
  { date: '2026-05-27', name: 'Kurban Bayramı (3. Gün)', type: 'resmi' },
  { date: '2026-05-28', name: 'Kurban Bayramı (4. Gün)', type: 'resmi' },
  { date: '2026-07-15', name: 'Demokrasi ve Milli Birlik Günü', type: 'resmi' },
  { date: '2026-08-30', name: 'Zafer Bayramı', type: 'resmi' },
  { date: '2026-10-28', name: 'Cumhuriyet Bayramı Arifesi (Yarım Gün)', type: 'resmi' },
  { date: '2026-10-29', name: 'Cumhuriyet Bayramı', type: 'resmi' },
]

export default function TakvimPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [staff, setStaff] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [schedule, setSchedule] = useState({})
  const [selectedDay, setSelectedDay] = useState(null)
  const [showScheduler, setShowScheduler] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState([])
  const [allStaff, setAllStaff] = useState([])

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const isAdmin = ['ADMIN', 'MANAGER'].includes(user?.role)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userSnap = await getDocs(collection(db, 'user'))
        const users = userSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        setStaff(users)
        setAllStaff(users)

        const leaveSnap = await getDocs(query(collection(db, 'leaveRequests'), where('status', '==', 'approved')))
        setLeaveRequests(leaveSnap.docs.map(d => ({ id: d.id, ...d.data() })))

        const scheduleSnap = await getDocs(collection(db, 'schedules'))
        const schedData = {}
        scheduleSnap.docs.forEach(d => {
          schedData[d.id] = d.data().staffIds || []
        })
        setSchedule(schedData)
      } catch (e) {}
    }
    fetchData()
  }, [])

  if (!user) return null

  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const startDay = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()

  const formatDateStr = (day) => `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const getBirthdaysForDay = (day) => {
    return staff.filter(s => {
      if (!s.birthday) return false
      const bd = new Date(s.birthday)
      return bd.getDate() === day && bd.getMonth() === currentMonth
    })
  }

  const getHolidaysForDay = (day) => {
    const ds = formatDateStr(day)
    return HOLIDAYS_2026.filter(h => h.date === ds)
  }

  const getLeavesForDay = (day) => {
    const ds = formatDateStr(day)
    return leaveRequests.filter(l => ds >= l.startDate && ds <= l.endDate)
  }

  const getScheduledForDay = (day) => {
    const ds = formatDateStr(day)
    const ids = schedule[ds] || []
    return ids.map(id => staff.find(s => s.id === id)).filter(Boolean)
  }

  const isToday = (day) => formatDateStr(day) === todayStr

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }

  const openScheduler = (day) => {
    const ds = formatDateStr(day)
    setSelectedStaff(schedule[ds] || [])
    setSelectedDay(day)
    setShowScheduler(true)
  }

  const saveSchedule = async () => {
    if (selectedDay === null) return
    const ds = formatDateStr(selectedDay)
    try {
      await setDoc(doc(db, 'schedules', ds), { date: ds, staffIds: selectedStaff, updatedBy: user.uid })
      setSchedule(prev => ({ ...prev, [ds]: selectedStaff }))
      setShowScheduler(false)
      toast('Vardiya kaydedildi!', 'success')
    } catch (e) {
      toast('Kaydedilemedi', 'error')
    }
  }

  const toggleStaff = (id) => {
    setSelectedStaff(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const upcomingBirthdays = staff
    .filter(s => s.birthday)
    .map(s => {
      const bd = new Date(s.birthday)
      const thisYear = new Date(currentYear, bd.getMonth(), bd.getDate())
      if (thisYear < today) thisYear.setFullYear(currentYear + 1)
      const diff = Math.ceil((thisYear - today) / (1000 * 60 * 60 * 24))
      return { ...s, daysUntil: diff, nextDate: thisYear }
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5)

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>📅 Ekip Takvimi</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>{isAdmin ? 'Takvim, tatiller, vardiya yönetimi' : 'Takvim, tatiller, doğum günleri'}</p>
      </div>

      {/* Takvim */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button onClick={prevMonth} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', cursor: 'pointer' }}>←</button>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>{MONTHS[currentMonth]} {currentYear}</h3>
          <button onClick={nextMonth} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', cursor: 'pointer' }}>→</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', textAlign: 'center' }}>
          {DAYS.map(d => (
            <div key={d} style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', padding: '0.5rem 0' }}>{d}</div>
          ))}
          {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const ds = formatDateStr(day)
            const birthdays = getBirthdaysForDay(day)
            const holidays = getHolidaysForDay(day)
            const leaves = getLeavesForDay(day)
            const scheduled = getScheduledForDay(day)
            const hasHoliday = holidays.length > 0
            const hasSchedule = scheduled.length > 0
            const isCurrentDay = isToday(day)

            return (
              <div key={day} onClick={() => { setSelectedDay(day); setShowScheduler(false) }} style={{
                padding: '4px 2px', borderRadius: '0.5rem', cursor: 'pointer', minHeight: '52px',
                backgroundColor: hasHoliday ? 'rgba(239,68,68,0.15)' : isCurrentDay ? 'rgba(59,130,246,0.15)' : 'transparent',
                border: hasHoliday ? '2px solid #ef4444' : isCurrentDay ? '2px solid #3b82f6' : '1px solid transparent',
                transition: 'all 0.15s ease'
              }}>
                <div style={{
                  fontSize: '12px', fontWeight: isCurrentDay || hasHoliday ? '700' : '400',
                  color: hasHoliday ? '#ef4444' : isCurrentDay ? '#3b82f6' : '#f8fafc'
                }}>{day}</div>
                <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                  {birthdays.length > 0 && <span style={{ fontSize: '9px' }}>🎂</span>}
                  {hasHoliday && <span style={{ fontSize: '9px' }}>🔴</span>}
                  {leaves.length > 0 && <span style={{ fontSize: '9px' }}>🏖️</span>}
                  {hasSchedule && <span style={{ fontSize: '9px' }}>👥</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Seçilen Gün Detay */}
      {selectedDay && !showScheduler && (
        <div className="card" style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>
              {selectedDay} {MONTHS[currentMonth]} {currentYear}
            </h4>
            {isAdmin && (
              <button onClick={() => openScheduler(selectedDay)} style={{
                padding: '0.375rem 0.75rem', borderRadius: '0.5rem', fontSize: '12px', fontWeight: '600',
                border: 'none', cursor: 'pointer', backgroundColor: 'rgba(139,92,246,0.2)', color: '#a78bfa'
              }}>
                👥 Vardiya Seç
              </button>
            )}
          </div>

          {(() => {
            const ds = formatDateStr(selectedDay)
            const holidays = getHolidaysForDay(selectedDay)
            const birthdays = getBirthdaysForDay(selectedDay)
            const leaves = getLeavesForDay(selectedDay)
            const scheduled = getScheduledForDay(selectedDay)
            if (holidays.length === 0 && birthdays.length === 0 && leaves.length === 0 && scheduled.length === 0) {
              return <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Bu gün için özel bir etkinlik yok</div>
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {holidays.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(239,68,68,0.1)', fontSize: '13px', color: '#fca5a5' }}>
                    🔴 <strong>{h.name}</strong> <span style={{ fontSize: '11px', color: '#ef4444' }}>(Resmi Tatil)</span>
                  </div>
                ))}
                {birthdays.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(236,72,153,0.1)', fontSize: '13px', color: '#f9a8d4' }}>
                    🎂 {b.name || b.email} — Doğum Günü
                  </div>
                ))}
                {leaves.map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(245,158,11,0.1)', fontSize: '13px', color: '#fcd34d' }}>
                    🏖️ {l.userName || l.userId} — İzin ({l.leaveType})
                  </div>
                ))}
                {scheduled.length > 0 && (
                  <div style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', backgroundColor: 'rgba(139,92,246,0.1)', fontSize: '13px', color: '#c4b5fd' }}>
                    👥 <strong>Vardiyada ({scheduled.length} kişi):</strong>
                    <div style={{ marginTop: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {scheduled.map(s => (
                        <span key={s.id} style={{ padding: '0.125rem 0.5rem', borderRadius: '9999px', backgroundColor: 'rgba(139,92,246,0.2)', fontSize: '12px' }}>
                          {s.name || s.email}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Vardiya Seçim Paneli */}
      {showScheduler && isAdmin && selectedDay && (
        <div className="card" style={{ marginTop: '0.75rem', border: '2px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>
              👥 Vardiya Seç — {selectedDay} {MONTHS[currentMonth]}
            </h4>
            <button onClick={() => setShowScheduler(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>✕</button>
          </div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '0.75rem' }}>Bu gün çalışacak personelleri seçin</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '300px', overflowY: 'auto' }}>
            {allStaff.map(s => (
              <label key={s.id} onClick={() => toggleStaff(s.id)} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem',
                borderRadius: '0.5rem', cursor: 'pointer',
                backgroundColor: selectedStaff.includes(s.id) ? 'rgba(139,92,246,0.15)' : '#0f172a',
                border: `1px solid ${selectedStaff.includes(s.id) ? 'rgba(139,92,246,0.4)' : '#334155'}`,
                transition: 'all 0.15s ease'
              }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '4px',
                  border: `2px solid ${selectedStaff.includes(s.id) ? '#8b5cf6' : '#475569'}`,
                  backgroundColor: selectedStaff.includes(s.id) ? '#8b5cf6' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', color: '#fff', fontWeight: '700', flexShrink: 0
                }}>
                  {selectedStaff.includes(s.id) ? '✓' : ''}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{s.name || s.email}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.category || 'Genel'}</div>
                </div>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button onClick={() => setShowScheduler(false)} style={{
              flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: '600',
              border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer'
            }}>
              İptal
            </button>
            <button onClick={saveSchedule} style={{
              flex: 2, padding: '0.75rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: '600',
              border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff'
            }}>
              ✅ Kaydet ({selectedStaff.length} kişi)
            </button>
          </div>
        </div>
      )}

      {/* Yaklaşan Doğum Günleri */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>🎂 Yaklaşan Doğum Günleri</h3>
        {upcomingBirthdays.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>Doğum tarihi girilmemiş — Hesap Ayarları'ndan güncelleyebilirsiniz</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {upcomingBirthdays.map(s => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: '0.75rem', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '22px' }}>🎂</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{s.name || s.email}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(s.birthday).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</div>
                  </div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: s.daysUntil <= 7 ? '#ef4444' : '#10b981', padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: s.daysUntil <= 7 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)' }}>
                  {s.daysUntil === 0 ? '🎉 Bugün!' : `${s.daysUntil} gün`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', padding: '0.5rem 0' }}>
          {[
            { icon: '🎂', label: 'Doğum Günü', color: '#ec4899' },
            { icon: '🔴', label: 'Resmi Tatil', color: '#ef4444' },
            { icon: '🏖️', label: 'İzin Günü', color: '#f59e0b' },
            { icon: '👥', label: 'Vardiya', color: '#8b5cf6' }
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '11px', color: l.color }}>
              {l.icon} {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
