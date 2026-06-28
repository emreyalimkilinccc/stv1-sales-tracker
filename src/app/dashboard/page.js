'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatCurrency } from '@/lib/utils'
import DashboardCharts from '@/components/DashboardCharts'

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => { if (user) fetchDashboard() }, [user, dateRange])

  const handlePeriodChange = (period) => {
    const end = new Date(); let start = new Date()
    if (period === 'week') start.setDate(start.getDate() - 7)
    else if (period === 'month') start.setMonth(start.getMonth() - 1)
    else if (period === 'year') start.setFullYear(start.getFullYear() - 1)
    setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] })
  }

  const fetchDashboard = async () => {
    try {
      const startDate = new Date(dateRange.start); const endDate = new Date(dateRange.end); endDate.setHours(23, 59, 59, 999)
      let salesQuery
      if (user.role === 'STAFF') {
        salesQuery = query(collection(db, 'sales'), where('userId', '==', user.uid), orderBy('date', 'desc'))
      } else {
        salesQuery = query(collection(db, 'sales'), orderBy('date', 'desc'))
      }
      const snapshot = await getDocs(salesQuery)
      const sales = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => { const d = new Date(s.date); return d >= startDate && d <= endDate })
      const totalAmount = sales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
      const totalItems = sales.reduce((sum, s) => sum + (parseInt(s.itemCount) || 0), 0)
      const avgAmount = sales.length > 0 ? totalAmount / sales.length : 0
      const dailyData = sales.reduce((acc, sale) => {
        const date = sale.date.split('T')[0]
        if (!acc[date]) acc[date] = { date, amount: 0, count: 0 }
        acc[date].amount += parseFloat(sale.amount) || 0; acc[date].count++; return acc
      }, {})
      const dailyStats = Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date))
      let staffStats = []
      if (user.role !== 'STAFF') {
        const staffData = sales.reduce((acc, sale) => {
          if (!acc[sale.userId]) acc[sale.userId] = { userId: sale.userId, userName: sale.userName || 'Bilinmeyen', amount: 0, count: 0 }
          acc[sale.userId].amount += parseFloat(sale.amount) || 0; acc[sale.userId].count++; return acc
        }, {})
        staffStats = Object.values(staffData).sort((a, b) => b.amount - a.amount).slice(0, 10)
      }
      setData({ summary: { totalAmount, totalItems, avgAmount, salesCount: sales.length }, dailyStats, staffStats })
    } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem', animation: 'spin 1s linear infinite' }}>⏳</div>
        <div style={{ color: '#3b82f6', fontSize: '16px' }}>Yükleniyor...</div>
      </div>
    </div>
  )

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="page-header" style={{
        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>📊 Satış Verileri</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Hoş geldiniz, {user?.name}</p>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-2" style={{ marginBottom: '1rem' }}>
          {[
            { key: 'week', label: '📅 Son 7 Gün', color: '#3b82f6' },
            { key: 'month', label: '📅 Son 30 Gün', color: '#8b5cf6' },
            { key: 'year', label: '📅 Son 1 Yıl', color: '#10b981' }
          ].map(p => (
            <button key={p.key} onClick={() => handlePeriodChange(p.key)} style={{
              flex: 1, padding: '0.625rem', borderRadius: '0.75rem', fontSize: '12px', fontWeight: '600',
              border: 'none', backgroundColor: `${p.color}20`, color: p.color, cursor: 'pointer'
            }}>{p.label}</button>
          ))}
        </div>
        <div className="flex gap-3">
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
            style={{ flex: 1, padding: '0.625rem', borderRadius: '0.75rem', fontSize: '13px', minWidth: 0, backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }} />
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
            style={{ flex: 1, padding: '0.625rem', borderRadius: '0.75rem', fontSize: '13px', minWidth: 0, backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }} />
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Toplam Satış', value: formatCurrency(data?.summary?.totalAmount || 0), icon: '💰', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
          { label: 'İşlem Sayısı', value: data?.summary?.salesCount || 0, icon: '🧾', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
          { label: 'Toplam Ürün', value: data?.summary?.totalItems || 0, icon: '📦', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
          { label: 'Ortalama', value: formatCurrency(data?.summary?.avgAmount || 0), icon: '📈', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' }
        ].map((stat, i) => (
          <div key={i} className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: '-8px', right: '-8px',
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: stat.bg, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '22px'
            }}>{stat.icon}</div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <DashboardCharts dailyStats={data?.dailyStats} staffStats={data?.staffStats} />
    </div>
  )
}
