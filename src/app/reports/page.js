'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatCurrency } from '@/lib/utils'
import DashboardCharts from '@/components/DashboardCharts'

export default function ReportsPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [groupBy, setGroupBy] = useState('day')
  const [selectedStaff, setSelectedStaff] = useState('')
  const [allStaff, setAllStaff] = useState([])

  useEffect(() => { if (user && user.role !== 'STAFF') { fetchReport(); fetchStaffList() } }, [user, dateRange, groupBy])

  const fetchStaffList = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'user'))
      setAllStaff(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) { console.error(error) }
  }

  const handlePeriodChange = (period) => {
    const end = new Date(); let start = new Date()
    if (period === 'week') start.setDate(start.getDate() - 7)
    else if (period === 'month') start.setMonth(start.getMonth() - 1)
    else if (period === 'year') start.setFullYear(start.getFullYear() - 1)
    setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] })
  }

  const fetchReport = async () => {
    try {
      const startDate = new Date(dateRange.start); const endDate = new Date(dateRange.end); endDate.setHours(23, 59, 59, 999)
      let salesQuery
      if (user.role === 'MANAGER') {
        salesQuery = query(collection(db, 'sales'), where('storeId', '==', user.storeId), orderBy('date', 'desc'))
      } else {
        salesQuery = query(collection(db, 'sales'), orderBy('date', 'desc'))
      }
      const snapshot = await getDocs(salesQuery)
      let sales = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => { const d = new Date(s.date); return d >= startDate && d <= endDate })
      
      if (selectedStaff) { sales = sales.filter(s => s.userId === selectedStaff) }
      
      let groupedData = {}
      if (groupBy === 'day') { groupedData = sales.reduce((acc, s) => { const k = s.date.split('T')[0]; if (!acc[k]) acc[k] = { date: k, amount: 0, count: 0, items: 0 }; acc[k].amount += parseFloat(s.amount || 0); acc[k].count++; acc[k].items += parseInt(s.itemCount) || 0; return acc }, {}) }
      else if (groupBy === 'week') { groupedData = sales.reduce((acc, s) => { const d = new Date(s.date); const ws = new Date(d); ws.setDate(d.getDate() - d.getDay()); const k = ws.toISOString().split('T')[0]; if (!acc[k]) acc[k] = { week: k, amount: 0, count: 0, items: 0 }; acc[k].amount += parseFloat(s.amount || 0); acc[k].count++; acc[k].items += parseInt(s.itemCount) || 0; return acc }, {}) }
      else { groupedData = sales.reduce((acc, s) => { const k = s.date.substring(0, 7); if (!acc[k]) acc[k] = { month: k, amount: 0, count: 0, items: 0 }; acc[k].amount += parseFloat(s.amount || 0); acc[k].count++; acc[k].items += parseInt(s.itemCount) || 0; return acc }, {}) }
      
      const dailyStats = Object.values(groupedData)
      setData({ groupedData: dailyStats, totalSales: sales.length, totalAmount: sales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) })
    } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
  }

  if (!user || user.role === 'STAFF') return <div className="min-h-screen flex items-center justify-center"><div>🚫 Erişim yetkiniz yok</div></div>
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>📈 Raporlar</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Satış raporlarını görüntüleyin</p>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-2" style={{ marginBottom: '1rem' }}>
          {[
            { key: 'week', label: '📅 7G', color: '#3b82f6' },
            { key: 'month', label: '📅 30G', color: '#8b5cf6' },
            { key: 'year', label: '📅 1Y', color: '#10b981' }
          ].map(p => (
            <button key={p.key} onClick={() => handlePeriodChange(p.key)} style={{ flex: 1, padding: '0.625rem', borderRadius: '0.75rem', fontSize: '12px', fontWeight: '600', border: 'none', backgroundColor: `${p.color}20`, color: p.color, cursor: 'pointer' }}>{p.label}</button>
          ))}
        </div>
        <div className="flex gap-3" style={{ marginBottom: '1rem' }}>
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
            style={{ flex: 1, padding: '0.625rem', borderRadius: '0.75rem', fontSize: '13px', minWidth: 0, backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }} />
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
            style={{ flex: 1, padding: '0.625rem', borderRadius: '0.75rem', fontSize: '13px', minWidth: 0, backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }} />
        </div>
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ width: '100%', padding: '0.625rem', borderRadius: '0.75rem', fontSize: '13px', backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc', marginBottom: '1rem' }}>
          <option value="day">📊 Günlük</option><option value="week">📊 Haftalık</option><option value="month">📊 Aylık</option>
        </select>
        
        {user.role === 'MANAGER' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '0.375rem', display: 'block' }}>👤 Personel Seçin:</label>
            <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc', fontSize: '13px' }}>
              <option value="">Tüm Personel</option>
              {allStaff.filter(s => s.role === 'STAFF').map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {data && (
        <>
          <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
            {[
              { label: 'Toplam', value: formatCurrency(data.totalAmount || 0), color: '#f59e0b' },
              { label: 'İşlem', value: data.totalSales || 0, color: '#3b82f6' },
              { label: 'Ortalama', value: data.totalSales > 0 ? formatCurrency(data.totalAmount / data.totalSales) : '0 TL', color: '#10b981' }
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value" style={{ color: stat.color, fontSize: '16px' }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* GRAFİKLER - Tarih bilgilerinin altında */}
          <DashboardCharts dailyStats={data.groupedData} staffStats={[]} />

          <div className="card" style={{ marginTop: '1rem' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📊 Satış Detayları</h3>
            <div className="space-y-3">
              {data.groupedData?.map((row, i) => (
                <div key={i} className="list-item" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.25rem' }}>📅 {row.date || row.week || row.month}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>🧾 {row.count} işlem • 📦 {row.items} ürün</div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#f59e0b' }}>
                      {formatCurrency(row.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
