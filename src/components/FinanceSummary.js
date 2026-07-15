'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'

const TYPES = [
  { id: 'banka', label: 'Banka', icon: '🏦', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  { id: 'marka', label: 'Marka Primi', icon: '🏷️', color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { id: 'normal', label: 'Normal Prim', icon: '💵', color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' }
]

export default function FinanceSummary() {
  const { user } = useAuth()
  const [data, setData] = useState({ banka: 0, marka: 0, normal: 0, userTotal: 0, userBanka: 0, userMarka: 0, userNormal: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      try {
        const now = new Date()
        const month = now.getMonth()
        const year = now.getFullYear()

        const snap = await getDocs(collection(db, 'finance'))
        let banka = 0, marka = 0, normal = 0
        let userTotal = 0, userBanka = 0, userMarka = 0, userNormal = 0

        snap.docs.forEach(d => {
          const r = d.data()
          const rDate = new Date(r.date)
          const isThisMonth = rDate.getMonth() === month && rDate.getFullYear() === year
          if (!isThisMonth) return

          if (r.type === 'banka') banka += r.amount || 0
          else if (r.type === 'marka') marka += r.amount || 0
          else if (r.type === 'normal') normal += r.amount || 0

          if (r.userId === user.uid) {
            userTotal += r.amount || 0
            if (r.type === 'banka') userBanka += r.amount || 0
            else if (r.type === 'marka') userMarka += r.amount || 0
            else if (r.type === 'normal') userNormal += r.amount || 0
          }
        })

        setData({ banka, marka, normal, userTotal, userBanka, userMarka, userNormal })
      } catch (e) {}
      setLoading(false)
    }
    fetchData()
  }, [user])

  if (!user || loading) return null

  const total = data.banka + data.marka + data.normal
  if (total === 0 && data.userTotal === 0) return null

  const formatCurrency = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)

  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Başlık */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', padding: '0 0.25rem' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>💰 Bu Ayın Özeti</span>
        {['ADMIN', 'MANAGER'].includes(user.role) && (
          <Link href="/muhasebe" style={{ fontSize: '11px', color: '#10b981', textDecoration: 'none', fontWeight: '600' }}>Tümünü Gör →</Link>
        )}
      </div>

      {/* Genel Toplam */}
      {total > 0 && (
        <div style={{
          padding: '1rem', borderRadius: '0.75rem', marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.05))',
          border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bu Ay Toplam Prim / Banka</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', marginTop: '0.25rem' }}>{formatCurrency(total)}</div>
        </div>
      )}

      {/* 3 Kart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        {TYPES.map(t => {
          const val = data[t.id] || 0
          return (
            <div key={t.id} style={{
              padding: '0.75rem 0.5rem', borderRadius: '0.75rem', textAlign: 'center',
              background: `${t.color}10`, border: `1px solid ${t.color}25`,
              transition: 'all 0.2s ease'
            }}>
              <div style={{ fontSize: '22px', marginBottom: '0.25rem' }}>{t.icon}</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: t.color }}>{formatCurrency(val)}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '0.125rem' }}>{t.label}</div>
            </div>
          )
        })}
      </div>

      {/* Kişisel Özet */}
      {data.userTotal > 0 && (
        <div style={{
          marginTop: '0.5rem', padding: '0.75rem', borderRadius: '0.75rem',
          backgroundColor: '#0f172a', border: '1px solid #1e293b'
        }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            👤 {user.name || 'Siz'} — Bu Ayki Kazancınız
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>{formatCurrency(data.userTotal)}</div>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {data.userBanka > 0 && <span style={{ fontSize: '10px', padding: '0.125rem 0.375rem', borderRadius: '9999px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>🏦 {formatCurrency(data.userBanka)}</span>}
              {data.userMarka > 0 && <span style={{ fontSize: '10px', padding: '0.125rem 0.375rem', borderRadius: '9999px', backgroundColor: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>🏷️ {formatCurrency(data.userMarka)}</span>}
              {data.userNormal > 0 && <span style={{ fontSize: '10px', padding: '0.125rem 0.375rem', borderRadius: '9999px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#34d399' }}>💵 {formatCurrency(data.userNormal)}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
