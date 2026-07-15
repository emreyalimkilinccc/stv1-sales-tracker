'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, getDocs, query, where, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/components/Toast'
import { getHolidays } from '@/lib/holidays'

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

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
  const holidays = useMemo(() => getHolidays(currentYear), [currentYear])

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
    return holidays.filter(h => h.date === ds)
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
            const hasBirthday = birthdays.length > 0
            const hasLeave = leaves.length > 0
            const isCurrentDay = isToday(day)

            const eventCount = (hasHoliday ? 1 : 0) + (hasBirthday ? 1 : 0) + (hasLeave ? 1 : 0) + (hasSchedule ? 1 : 0)
            const hasAnyEvent = eventCount > 0

            let borderColor = '#1e293b'
            let bgColor = 'transparent'
            if (hasHoliday) { borderColor = '#ef4444'; bgColor = 'rgba(239,68,68,0.12)' }
            else if (hasBirthday) { borderColor = '#ec4899'; bgColor = 'rgba(236,72,153,0.12)' }
            else if (hasSchedule) { borderColor = '#8b5cf6'; bgColor = 'rgba(139,92,246,0.12)' }
            else if (hasLeave) { borderColor = '#f59e0b'; bgColor = 'rgba(245,158,11,0.08)' }
            else if (isCurrentDay) { borderColor = '#3b82f6'; bgColor = 'rgba(59,130,246,0.1)' }

            return (
              <div key={day} onClick={() => { setSelectedDay(day); setShowScheduler(false) }} style={{
                padding: '4px 2px', borderRadius: '0.5rem', cursor: 'pointer', minHeight: '56px',
                backgroundColor: bgColor,
                border: `${hasAnyEvent || isCurrentDay ? '2px' : '1px'} solid ${borderColor}`,
                transition: 'all 0.15s ease'
              }}>
                <div style={{
                  fontSize: '12px', fontWeight: isCurrentDay || hasHoliday ? '700' : '400',
                  color: hasHoliday ? '#ef4444' : isCurrentDay ? '#3b82f6' : '#f8fafc'
                }}>{day}</div>
                <div style={{ display: 'flex', gap: '1px', justifyContent: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                  {hasHoliday && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444' }} />}
                  {hasBirthday && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ec4899' }} />}
                  {hasSchedule && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#8b5cf6' }} />}
                  {hasLeave && <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Seçilen Gün Detay */}
      {selectedDay && !showScheduler && (
        <div className="card" style={{ marginTop: '0.75rem', overflow: 'hidden' }}>
          {/* Gün Başlık Çubuğu */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, #334155, #1e293b)',
            borderBottom: '1px solid #475569'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '0.75rem',
                backgroundColor: 'rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', fontWeight: '800', color: '#a78bfa'
              }}>
                {selectedDay}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
                  {MONTHS[currentMonth]} {currentYear}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {DAYS[(new Date(currentYear, currentMonth, selectedDay).getDay() + 6) % 7]}
                </div>
              </div>
            </div>
            {isAdmin && (
              <button onClick={() => openScheduler(selectedDay)} style={{
                padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '13px', fontWeight: '600',
                border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: '#fff',
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                boxShadow: '0 2px 8px rgba(139,92,246,0.3)'
              }}>
                👥 Vardiya Seç
              </button>
            )}
          </div>

          {/* Etkinlikler */}
          <div style={{ padding: '1rem 1.25rem' }}>
            {(() => {
              const holidays = getHolidaysForDay(selectedDay)
              const birthdays = getBirthdaysForDay(selectedDay)
              const leaves = getLeavesForDay(selectedDay)
              const scheduled = getScheduledForDay(selectedDay)
              const hasAny = holidays.length > 0 || birthdays.length > 0 || leaves.length > 0 || scheduled.length > 0
              if (!hasAny) return <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Bu gün için özel bir etkinlik yok</div>

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Resmi Tatiller */}
                  {holidays.map((h, i) => (
                    <div key={`h-${i}`} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                      borderRadius: '0.75rem', backgroundColor: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.2)'
                    }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', backgroundColor: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🔴</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#fca5a5' }}>{h.name}</div>
                        <div style={{ fontSize: '11px', color: '#ef4444' }}>Resmi Tatil</div>
                      </div>
                    </div>
                  ))}

                  {/* Doğum Günleri */}
                  {birthdays.map((b, i) => (
                    <div key={`b-${i}`} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                      borderRadius: '0.75rem', backgroundColor: 'rgba(236,72,153,0.08)',
                      border: '1px solid rgba(236,72,153,0.2)'
                    }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', backgroundColor: 'rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🎂</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#f9a8d4' }}>{b.name || b.email}</div>
                        <div style={{ fontSize: '11px', color: '#ec4899' }}>Doğum Günü</div>
                      </div>
                    </div>
                  ))}

                  {/* İzinler */}
                  {leaves.map((l, i) => (
                    <div key={`l-${i}`} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                      borderRadius: '0.75rem', backgroundColor: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.2)'
                    }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', backgroundColor: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🏖️</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#fcd34d' }}>{l.userName || l.userId}</div>
                        <div style={{ fontSize: '11px', color: '#f59e0b' }}>İzin — {l.leaveType || 'Belirtilmemiş'}</div>
                      </div>
                    </div>
                  ))}

                  {/* Vardiya */}
                  {scheduled.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      {/* Butonlar */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <button onClick={() => {
                          const el = document.getElementById('vardiya-evrak')
                          if (!el) return
                          const win = window.open('', '_blank')
                          win.document.write(`<!DOCTYPE html><html><head><title>Vardiya Talimatı</title><style>@page{margin:2cm}body{font-family:Arial,sans-serif;color:#1a1a1a;padding:2rem}h1{text-align:center;font-size:18px;border-bottom:2px solid #333;padding-bottom:10px}h2{text-align:center;font-size:14px;font-weight:normal;color:#555}.info{text-align:center;margin:20px 0;font-size:13px}.table{width:100%;border-collapse:collapse;margin:20px 0}.table th,.table td{border:1px solid #333;padding:8px 12px;text-align:left;font-size:13px}.table th{background:#f0f0f0}.footer{margin-top:40px;display:flex;justify-content:space-between;font-size:12px}.footer div{text-align:center}.line{width:200px;border-top:1px solid #333;margin-top:50px}</style></head><body>`)
                          win.document.write(el.innerHTML)
                          win.document.write('</body></html>')
                          win.document.close()
                          setTimeout(() => { win.print(); win.close() }, 500)
                        }} style={{
                          flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px', fontWeight: '600',
                          border: '1px solid #334155', backgroundColor: '#0f172a', color: '#94a3b8', cursor: 'pointer'
                        }}>
                          🖨️ Yazdır
                        </button>
                        <button onClick={() => {
                          const el = document.getElementById('vardiya-evrak')
                          if (!el) return
                          const text = el.innerText
                          const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url; a.download = `vardiya-${formatDateStr(selectedDay)}.txt`; a.click()
                          URL.revokeObjectURL(url)
                        }} style={{
                          flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px', fontWeight: '600',
                          border: '1px solid #334155', backgroundColor: '#0f172a', color: '#94a3b8', cursor: 'pointer'
                        }}>
                          📥 İndir
                        </button>
                      </div>

                      {/* Evrak */}
                      <div id="vardiya-evrak" style={{
                        backgroundColor: '#fff', color: '#1a1a1a', borderRadius: '0.5rem',
                        padding: '1.5rem', border: '2px solid #d1d5db',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        {/* Logo + Başlık */}
                        <div style={{ textAlign: 'center', borderBottom: '2px solid #1a1a1a', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a1a', letterSpacing: '0.05em' }}>STV1 SATIŞ TAKİP SİSTEMİ</div>
                          <div style={{ fontSize: '13px', color: '#666', marginTop: '0.25rem' }}>Mağaza Vardiya Talimatı</div>
                        </div>

                        {/* Tarih ve Konu */}
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                          <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', marginBottom: '0.25rem' }}>
                            {selectedDay} {MONTHS[currentMonth]} {currentYear}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {DAYS[(new Date(currentYear, currentMonth, selectedDay).getDay() + 6) % 7]} | Talimat No: VD-{formatDateStr(selectedDay).replace(/-/g, '')}
                          </div>
                        </div>

                        {/* Resmi Tatil Uyarısı */}
                        {holidays.filter(h => h.date === formatDateStr(selectedDay)).length > 0 && (
                          <div style={{ textAlign: 'center', padding: '0.5rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '13px', color: '#dc2626', fontWeight: '600' }}>
                            ⚠️ BU GÜN RESMİ TATİLDİR — {holidays.filter(h => h.date === formatDateStr(selectedDay)).map(h => h.name).join(', ')}
                          </div>
                        )}

                        {/* Giriş Yazısı */}
                        <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#374151', marginBottom: '1rem', textAlign: 'justify' }}>
                          Aşağıda belirtilen personel, <strong>{selectedDay} {MONTHS[currentMonth]} {currentYear}</strong> tarihinde görev yapmak üzere görevlendirilmiştir.
                        </div>

                        {/* Tablo */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                              <th style={{ border: '1px solid #d1d5db', padding: '8px 12px', textAlign: 'left', fontWeight: '700', width: '40px' }}>Sıra</th>
                              <th style={{ border: '1px solid #d1d5db', padding: '8px 12px', textAlign: 'left', fontWeight: '700' }}>Adı Soyadı</th>
                              <th style={{ border: '1px solid #d1d5db', padding: '8px 12px', textAlign: 'left', fontWeight: '700' }}>Görevi</th>
                              <th style={{ border: '1px solid #d1d5db', padding: '8px 12px', textAlign: 'left', fontWeight: '700' }}>Kategori</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scheduled.map((s, i) => (
                              <tr key={s.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                <td style={{ border: '1px solid #d1d5db', padding: '8px 12px' }}>{i + 1}</td>
                                <td style={{ border: '1px solid #d1d5db', padding: '8px 12px', fontWeight: '600' }}>{s.name || s.email}</td>
                                <td style={{ border: '1px solid #d1d5db', padding: '8px 12px' }}>{s.role === 'ADMIN' ? 'Yönetici' : s.role === 'MANAGER' ? 'Müdür' : 'Personel'}</td>
                                <td style={{ border: '1px solid #d1d5db', padding: '8px 12px' }}>{s.category || 'Genel'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Toplam */}
                        <div style={{ fontSize: '13px', color: '#374151', marginBottom: '1.5rem' }}>
                          Toplam <strong>{scheduled.length}</strong> personel görev yapacaktır.
                        </div>

                        {/* İmza Alanı */}
                        {(() => {
                          const manager = scheduled.find(s => s.role === 'MANAGER') || allStaff.find(s => s.role === 'MANAGER') || user
                          return (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1rem' }}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ width: '150px', borderBottom: '1px solid #1a1a1a', marginBottom: '0.375rem', height: '30px' }} />
                                <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Mağaza Müdürü</div>
                                <div style={{ fontSize: '11px', color: '#666' }}>{manager?.name || '________________'}</div>
                              </div>
                            </div>
                          )
                        })()}

                        {/* Alt Bilgi */}
                        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid #d1d5db', fontSize: '10px', color: '#9ca3af' }}>
                          Bu belge STV1 Satış Takip Sistemi tarafından otomatik olarak oluşturulmuştur.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Vardiya Seçim Paneli — Modal Overlay */}
      {showScheduler && isAdmin && selectedDay && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease'
        }} onClick={() => setShowScheduler(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: '480px', maxHeight: '85vh',
            backgroundColor: '#1e293b', borderRadius: '1.25rem 1.25rem 0 0',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.3s ease'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              position: 'relative'
            }}>
              <div style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', width: '36px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.3)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginBottom: '0.25rem' }}>
                    👥 Vardiya Yönetimi
                  </h3>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                    {selectedDay} {MONTHS[currentMonth]} {currentYear} — Çalışacak personelleri seçin
                  </p>
                </div>
                <button onClick={() => setShowScheduler(false)} style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.15)', border: 'none',
                  color: '#fff', fontSize: '16px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>✕</button>
              </div>
              {/* Seçim sayacı */}
              <div style={{
                marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.25rem 0.75rem', borderRadius: '9999px',
                backgroundColor: 'rgba(255,255,255,0.15)', fontSize: '12px', fontWeight: '600', color: '#fff'
              }}>
                ✅ {selectedStaff.length} / {allStaff.length} kişi seçildi
              </div>
            </div>

            {/* Hızlı Seçim Butonları */}
            <div style={{ padding: '0.75rem 1.5rem', display: 'flex', gap: '0.5rem', borderBottom: '1px solid #334155' }}>
              <button onClick={() => setSelectedStaff(allStaff.map(s => s.id))} style={{
                flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px', fontWeight: '600',
                border: '1px solid #475569', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer'
              }}>
                ✅ Tümünü Seç
              </button>
              <button onClick={() => setSelectedStaff([])} style={{
                flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px', fontWeight: '600',
                border: '1px solid #475569', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer'
              }}>
                ❌ Tümünü Kaldır
              </button>
            </div>

            {/* Personel Listesi */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1.5rem' }}>
              {allStaff.map(s => {
                const isSelected = selectedStaff.includes(s.id)
                return (
                  <div key={s.id} onClick={() => toggleStaff(s.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem', marginBottom: '0.375rem', borderRadius: '0.75rem',
                    backgroundColor: isSelected ? 'rgba(139,92,246,0.12)' : '#0f172a',
                    border: `1px solid ${isSelected ? 'rgba(139,92,246,0.4)' : '#1e293b'}`,
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      backgroundColor: isSelected ? 'rgba(139,92,246,0.2)' : '#1e293b',
                      border: `2px solid ${isSelected ? '#8b5cf6' : '#334155'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: '700', color: isSelected ? '#a78bfa' : '#64748b',
                      flexShrink: 0, transition: 'all 0.15s ease'
                    }}>
                      {(s.name || '?').substring(0, 1).toUpperCase()}
                    </div>
                    {/* Bilgi */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{s.name || s.email}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span style={{
                          display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%',
                          backgroundColor: s.role === 'ADMIN' ? '#ef4444' : s.role === 'MANAGER' ? '#f59e0b' : '#3b82f6'
                        }} />
                        {s.category || 'Genel'}
                        <span style={{ color: '#475569' }}>•</span>
                        {s.role === 'ADMIN' ? 'Yönetici' : s.role === 'MANAGER' ? 'Müdür' : 'Personel'}
                      </div>
                    </div>
                    {/* Checkbox */}
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '6px',
                      border: `2px solid ${isSelected ? '#8b5cf6' : '#475569'}`,
                      backgroundColor: isSelected ? '#8b5cf6' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', color: '#fff', fontWeight: '700', flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}>
                      {isSelected ? '✓' : ''}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div style={{
              padding: '1rem 1.5rem', borderTop: '1px solid #334155',
              display: 'flex', gap: '0.75rem', backgroundColor: '#1e293b'
            }}>
              <button onClick={() => setShowScheduler(false)} style={{
                flex: 1, padding: '0.875rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: '600',
                border: '1px solid #475569', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer'
              }}>
                İptal
              </button>
              <button onClick={saveSchedule} style={{
                flex: 2, padding: '0.875rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: '700',
                border: 'none', cursor: 'pointer',
                background: selectedStaff.length > 0 ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : '#334155',
                color: '#fff',
                boxShadow: selectedStaff.length > 0 ? '0 4px 12px rgba(139,92,246,0.4)' : 'none'
              }}>
                {selectedStaff.length > 0 ? `✅ Vardiyayı Kaydet (${selectedStaff.length} kişi)` : 'Personel seçin'}
              </button>
            </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', padding: '0.5rem' }}>
          {[
            { color: '#ef4444', label: 'Resmi Tatil / Bayram', icon: '🔴' },
            { color: '#ec4899', label: 'Doğum Günü', icon: '🎂' },
            { color: '#8b5cf6', label: 'Vardiya (Çalışan)', icon: '👥' },
            { color: '#f59e0b', label: 'İzin Günü', icon: '🏖️' },
            { color: '#3b82f6', label: 'Bugün', icon: '📍' }
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.5rem', borderRadius: '0.5rem', backgroundColor: `${l.color}10`, border: `1px solid ${l.color}30` }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: l.color, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: l.color, fontWeight: '500' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
