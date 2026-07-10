'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getActivityLabel } from '@/lib/activityLog'

const ACTION_COLORS = {
  'sale_created': '#10b981', 'sale_updated': '#f59e0b', 'sale_deleted': '#ef4444',
  'user_created': '#3b82f6', 'user_deleted': '#ef4444',
  'lottery_started': '#8b5cf6', 'poll_created': '#06b6d4',
  'login': '#64748b', 'export_excel': '#10b981'
}

export default function ActivityLogTab() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

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
        setLogs(docs.slice(0, 50))
      } catch (error) { console.error(error) } finally { setLoading(false) }
    }
    fetchLogs()
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>⏳ Yükleniyor...</div>

  return (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📋 Son Aktiviteler (Son 50)</h3>
      {logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Henüz aktivite kaydı yok</div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const color = ACTION_COLORS[log.action] || '#64748b'
            const time = log.timestamp?.toDate ? log.timestamp.toDate() : new Date()
            return (
              <div key={log.id} style={{
                backgroundColor: '#0f172a', borderRadius: '0.5rem', padding: '0.75rem',
                borderLeft: `3px solid ${color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{getActivityLabel(log.action)}</span>
                  {log.userName && log.userName !== 'Sistem' && (
                    <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '0.5rem' }}>— {log.userName}</span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {time.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
