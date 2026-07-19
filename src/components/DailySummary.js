'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function DailySummary() {
  const { user } = useAuth()
  const [data, setData] = useState({ sales: 0, salesCount: 0, mola: 0, molaCount: 0, transfer: 0, transferCount: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const hour = today.getHours()

    const fetchData = async () => {
      try {
        let sales = 0, salesCount = 0, mola = 0, molaCount = 0, transfer = 0, transferCount = 0

        // Satışlar
        const salesSnap = await getDocs(query(collection(db, 'sales'), where('date', '>=', todayStr)))
        salesSnap.docs.forEach(d => {
          const s = d.data()
          if (s.date && s.date.startsWith(todayStr)) {
            sales += parseFloat(s.amount) || 0
            salesCount++
          }
        })

        // Molalar
        const molaSnap = await getDocs(query(collection(db, 'breaks'), where('date', '==', todayStr)))
        molaSnap.docs.forEach(d => {
          const s = d.data()
          if (s.status === 'completed') {
            mola += s.duration || 0
            molaCount++
          }
        })

        // Transferler
        const transferSnap = await getDocs(query(collection(db, 'transfers'), where('date', '==', todayStr)))
        transfer = transferSnap.docs.length
        transferCount = transferSnap.docs.filter(d => d.data().category === 'magaza').length

        setData({ sales, salesCount, mola, molaCount: transferSnap.docs.length, transfer, transferCount })
      } catch (e) {}
      setLoading(false)
    }
    fetchData()
  }, [user])

  if (!user || loading) return null

  const formatCurrency = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)
  const formatMola = (sec) => `${Math.floor(sec / 60)} dk`
  const hour = new Date().getHours()

  const greeting = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'

  return (
    <div style={{
      padding: '1rem', borderRadius: '0.75rem', marginBottom: '1rem',
      background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))',
      border: '1px solid rgba(99,102,241,0.2)'
    }}>
      <div style={{ fontSize: '14px', fontWeight: '600', color: '#a78bfa', marginBottom: '0.5rem' }}>
        📊 {greeting}, {user.name || 'Personel'} — Günün Özeti
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        <div style={{ textAlign: 'center', padding: '0.375rem', borderRadius: '0.5rem', backgroundColor: 'rgba(16,185,129,0.1)' }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#10b981' }}>{formatCurrency(data.sales)}</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>{data.salesCount} satış</div>
        </div>
        <div style={{ textAlign: 'center', padding: '0.375rem', borderRadius: '0.5rem', backgroundColor: 'rgba(245,158,11,0.1)' }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#f59e0b' }}>{data.molaCount > 0 ? formatMola(data.mola) : '-'}</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>{data.molaCount} mola</div>
        </div>
        <div style={{ textAlign: 'center', padding: '0.375rem', borderRadius: '0.5rem', backgroundColor: 'rgba(139,92,246,0.1)' }}>
          <div style={{ fontSize: '16px', fontWeight: '800', color: '#8b5cf6' }}>{data.transfer}</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>transfer</div>
        </div>
      </div>
    </div>
  )
}
