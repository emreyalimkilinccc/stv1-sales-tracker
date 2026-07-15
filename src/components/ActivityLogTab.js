'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getActivityLabel } from '@/lib/activityLog'

const ACTION_COLORS = {
  'login': '#10b981', 'logout': '#ef4444', 'password_changed': '#f59e0b', 'birthday_updated': '#ec4899', 'settings_updated': '#8b5cf6',
  'sale_created': '#10b981', 'sale_updated': '#f59e0b', 'sale_deleted': '#ef4444', 'sale_sent': '#3b82f6',
  'user_created': '#3b82f6', 'user_deleted': '#ef4444', 'store_created': '#06b6d4', 'store_deleted': '#ef4444',
  'category_update': '#f59e0b', 'quota_updated': '#8b5cf6', 'backup_downloaded': '#10b981',
  'mola_started': '#f59e0b', 'mola_sent': '#10b981', 'mola_completed': '#3b82f6',
  'schedule_saved': '#8b5cf6',
  'finance_added': '#10b981', 'finance_deleted': '#ef4444',
  'leave_created': '#f59e0b', 'leave_approved': '#10b981', 'leave_rejected': '#ef4444',
  'poll_created': '#06b6d4', 'poll_voted': '#8b5cf6',
  'lottery_started': '#8b5cf6', 'lottery_winner': '#f59e0b',
  'inventory_created': '#10b981', 'inventory_updated': '#f59e0b', 'inventory_deleted': '#ef4444',
  'customer_created': '#3b82f6', 'customer_updated': '#f59e0b', 'customer_deleted': '#ef4444',
  'incoming_created': '#10b981', 'incoming_updated': '#f59e0b', 'incoming_deleted': '#ef4444',
  'delivery_created': '#3b82f6', 'delivery_updated': '#f59e0b', 'delivery_deleted': '#ef4444',
  'cleaning_completed': '#06b6d4',
  'export_csv': '#10b981', 'export_pdf': '#10b981', 'export_excel': '#10b981',
  'kasko_calculated': '#06b6d4'
}

const ACTION_GROUPS = [
  { label: 'Tümü', value: 'all' },
  { label: '🔑 Giriş/Çıkış', value: 'auth', actions: ['login', 'logout', 'password_changed'] },
  { label: '💰 Satış', value: 'sale', actions: ['sale_created', 'sale_updated', 'sale_deleted', 'sale_sent'] },
  { label: '☕ Mola', value: 'mola', actions: ['mola_started', 'mola_sent', 'mola_completed'] },
  { label: '📅 Takvim', value: 'schedule', actions: ['schedule_saved'] },
  { label: '💵 Muhasebe', value: 'finance', actions: ['finance_added', 'finance_deleted'] },
  { label: '👤 Kullanıcı', value: 'user', actions: ['user_created', 'user_deleted', 'store_created', 'store_deleted', 'category_update', 'quota_updated'] },
  { label: '📦 Diğer', value: 'other', actions: ['backup_downloaded', 'birthday_updated', 'settings_updated', 'leave_created', 'leave_approved', 'leave_rejected', 'poll_created', 'poll_voted', 'lottery_started', 'lottery_winner', 'inventory_created', 'inventory_updated', 'inventory_deleted', 'customer_created', 'customer_updated', 'customer_deleted', 'incoming_created', 'incoming_updated', 'incoming_deleted', 'delivery_created', 'delivery_updated', 'delivery_deleted', 'cleaning_completed', 'export_csv', 'export_pdf', 'export_excel', 'kasko_calculated'] }
]

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export default function ActivityLogTab() {
  const [allLogs, setAllLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [filterUser, setFilterUser] = useState('')

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'activityLog'))
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        docs.sort((a, b) => {
          const tA = a.timestamp?.seconds || 0
          const tB = b.timestamp?.seconds || 0
          return tB - tA
        })
        setAllLogs(docs)
      } catch (error) { console.error(error) } finally { setLoading(false) }
    }
    fetchLogs()
  }, [])

  const filteredLogs = allLogs.filter(log => {
    if (filterDate) {
      const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : null
      if (!logDate) return false
      const logDateStr = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}-${String(logDate.getDate()).padStart(2, '0')}`
      if (logDateStr !== filterDate) return false
    }
    if (filterAction !== 'all') {
      const group = ACTION_GROUPS.find(g => g.value === filterAction)
      if (group && group.actions && !group.actions.includes(log.action)) return false
    }
    if (filterUser) {
      const q = filterUser.toLowerCase()
      if (!(log.userName || '').toLowerCase().includes(q) && !(log.action || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const uniqueUsers = [...new Set(allLogs.map(l => l.userName).filter(Boolean))].sort()

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>⏳ Yükleniyor...</div>

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📋 Aktivite Logu</h3>

      {/* Filtreler */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {/* Tarih Filtresi */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={{
            flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '13px',
            border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', colorScheme: 'dark'
          }} />
          {filterDate && (
            <button onClick={() => setFilterDate('')} style={{
              padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '12px', fontWeight: '600',
              border: '1px solid #334155', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer'
            }}>✕</button>
          )}
        </div>

        {/* Tür Filtresi */}
        <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {ACTION_GROUPS.map(g => (
            <button key={g.value} onClick={() => setFilterAction(g.value)} style={{
              padding: '0.375rem 0.625rem', borderRadius: '9999px', fontSize: '11px', fontWeight: '600',
              border: `1px solid ${filterAction === g.value ? '#3b82f6' : '#334155'}`,
              backgroundColor: filterAction === g.value ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: filterAction === g.value ? '#3b82f6' : '#94a3b8',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s ease'
            }}>
              {g.label}
            </button>
          ))}
        </div>

        {/* Kişi Filtresi */}
        <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} style={{
          padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '13px',
          border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', colorScheme: 'dark'
        }}>
          <option value="">👤 Tüm kişiler</option>
          {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* Sonuç Sayısı */}
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '0.5rem' }}>
        {filteredLogs.length} / {allLogs.length} kayıt
      </div>

      {/* Liste */}
      {filteredLogs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Filtreye uygun kayıt yok</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {filteredLogs.map(log => {
            const color = ACTION_COLORS[log.action] || '#64748b'
            const time = log.timestamp?.toDate ? log.timestamp.toDate() : null
            return (
              <div key={log.id} style={{
                backgroundColor: '#0f172a', borderRadius: '0.5rem', padding: '0.625rem 0.75rem',
                borderLeft: `3px solid ${color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{getActivityLabel(log.action)}</span>
                    {log.userName && log.userName !== 'Sistem' && (
                      <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '0.375rem' }}>— {log.userName}</span>
                    )}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <span style={{ fontSize: '11px', color: '#475569', marginLeft: '0.375rem' }}>
                        {Object.entries(log.details).map(([k, v]) => `${k}:${v}`).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                {time && (
                  <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {time.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                    {time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
