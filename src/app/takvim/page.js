'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export default function TakvimPage() {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [staff, setStaff] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [selectedDay, setSelectedDay] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userSnap = await getDocs(collection(db, 'user'))
        const users = userSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.birthday)
        setStaff(users)

        const leaveSnap = await getDocs(query(collection(db, 'leaveRequests'), where('status', '==', 'approved')))
        setLeaveRequests(leaveSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) {}
    }
    fetchData()
  }, [])

  if (!user) return null

  const today = new Date()
  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  const startDay = (firstDay.getDay() + 6) % 7
  const daysInMonth = lastDay.getDate()

  const getBirthdaysForDay = (day) => {
    return staff.filter(s => {
      if (!s.birthday) return false
      const bd = new Date(s.birthday)
      return bd.getDate() === day && bd.getMonth() === currentMonth
    })
  }

  const getLeavesForDay = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return leaveRequests.filter(l => dateStr >= l.startDate && dateStr <= l.endDate)
  }

  const isToday = (day) => today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
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
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Doğum günleri, izinler ve özel günler</p>
      </div>

      {/* Takvim */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <button onClick={prevMonth} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', cursor: 'pointer' }}>←</button>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>{MONTHS[currentMonth]} {currentYear}</h3>
          <button onClick={nextMonth} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', cursor: 'pointer' }}>→</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
          {DAYS.map(d => (
            <div key={d} style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', padding: '0.5rem 0' }}>{d}</div>
          ))}
          {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const birthdays = getBirthdaysForDay(day)
            const leaves = getLeavesForDay(day)
            const hasEvents = birthdays.length > 0 || leaves.length > 0
            return (
              <div key={day} onClick={() => setSelectedDay(selectedDay === day ? null : day)} style={{
                padding: '0.5rem 0.25rem', borderRadius: '0.5rem', cursor: 'pointer',
                backgroundColor: isToday(day) ? 'rgba(59,130,246,0.2)' : selectedDay === day ? 'rgba(139,92,246,0.2)' : 'transparent',
                border: isToday(day) ? '2px solid #3b82f6' : '1px solid transparent',
                minHeight: '40px', position: 'relative'
              }}>
                <div style={{ fontSize: '13px', fontWeight: isToday(day) ? '700' : '400', color: isToday(day) ? '#3b82f6' : '#f8fafc' }}>{day}</div>
                {birthdays.length > 0 && <div style={{ fontSize: '10px', marginTop: '2px' }}>🎂</div>}
                {leaves.length > 0 && <div style={{ fontSize: '10px', marginTop: '2px' }}>🏖️</div>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Seçilen Gün Detay */}
      {selectedDay && (() => {
        const bdays = getBirthdaysForDay(selectedDay)
        const leaves = getLeavesForDay(selectedDay)
        if (bdays.length === 0 && leaves.length === 0) return null
        return (
          <div className="card" style={{ marginTop: '0.75rem', border: '1px solid #8b5cf6' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>
              {selectedDay} {MONTHS[currentMonth]}
            </h4>
            {bdays.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0', fontSize: '13px', color: '#ec4899' }}>
                🎂 {b.name || b.email} — Doğum Günü
              </div>
            ))}
            {leaves.map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0', fontSize: '13px', color: '#f59e0b' }}>
                🏖️ {l.userName || l.userId} — İzin ({l.leaveType})
              </div>
            ))}
          </div>
        )
      })()}

      {/* Yaklaşan Doğum Günleri */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>🎂 Yaklaşan Doğum Günleri</h3>
        {upcomingBirthdays.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>Doğum günü bilgisi girilmemiş</div>
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
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', padding: '0.5rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '12px', color: '#94a3b8' }}>
            <span>🎂</span> Doğum Günü
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '12px', color: '#94a3b8' }}>
            <span>🏖️</span> İzin Günü
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '12px', color: '#94a3b8' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid #3b82f6' }} /> Bugün
          </div>
        </div>
      </div>
    </div>
  )
}
