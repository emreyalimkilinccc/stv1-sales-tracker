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
  const [selectedStaff, setSelectedStaff] = useState('')
  const [allStaff, setAllStaff] = useState([])
  const [storeQuota, setStoreQuota] = useState(0)
  const [userQuota, setUserQuota] = useState(0)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  useEffect(() => { if (user) { fetchDashboard(); fetchStaffList(); fetchQuotas() } }, [user, dateRange])

  const fetchStaffList = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'user'))
      setAllStaff(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) { console.error(error) }
  }

  const fetchQuotas = async () => {
    try {
      // Bireysel kota: user koleksiyonundan
      const userDoc = await getDocs(query(collection(db, 'user'), where('__name__', '==', user.uid)))
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data()
        setUserQuota(userData.monthlyQuota || 0)
      }
      // Mağaza kotası: stores koleksiyonundan
      if (user.storeId) {
        const storeDoc = await getDocs(query(collection(db, 'stores'), where('__name__', '==', user.storeId)))
        if (!storeDoc.empty) {
          const storeData = storeDoc.docs[0].data()
          setStoreQuota(storeData.monthlyQuota || 0)
        }
      }
    } catch (error) { console.error(error) }
  }

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
      } else if (user.role === 'MANAGER') {
        salesQuery = query(collection(db, 'sales'), where('storeId', '==', user.storeId), orderBy('date', 'desc'))
      } else {
        salesQuery = query(collection(db, 'sales'), orderBy('date', 'desc'))
      }
      const snapshot = await getDocs(salesQuery)
      const allSales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      const sales = allSales.filter(s => { const d = new Date(s.date); return d >= startDate && d <= endDate })
      
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>📊 Satış Verileri</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Hoş geldiniz, {user?.name}</p>
      </div>

      {/* Tarih Filtresi */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: '0.75rem' }}>
          {[
            { key: 'week', label: '📅 Son 7 Gün', color: '#3b82f6' },
            { key: 'month', label: '📅 Son 30 Gün', color: '#8b5cf6' },
            { key: 'year', label: '📅 Son 1 Yıl', color: '#10b981' }
          ].map(p => (
            <button key={p.key} onClick={() => handlePeriodChange(p.key)} style={{
              padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '12px', fontWeight: '600',
              border: 'none', backgroundColor: `${p.color}20`, color: p.color, cursor: 'pointer'
            }}>{p.label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))}
            style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px', minWidth: 0, backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }} />
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))}
            style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px', minWidth: 0, backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }} />
        </div>
      </div>

      {/* AYLIK KOTA & MAĞAZA CİROSU */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>
          {user.role === 'STAFF' ? '👤 Bireysel Kota' : '🎯 Aylık Kota & Mağaza Cirosu'}
        </h3>
        
        {user.role === 'MANAGER' && (
          <div style={{ marginBottom: '0.75rem' }}>
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

        {/* YÖNETİCİ/MÜDÜR: 2 Sütun - Mağaza Kotası + Bireysel Kota */}
        {user.role !== 'STAFF' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            {/* Mağaza Kotası Grafiği */}
            <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #334155' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>🏪 Mağaza Kotası</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '0.5rem' }}>Kullanılan: <span style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(data?.summary?.totalAmount || 0)}</span> / <span style={{ color: '#10b981', fontWeight: '600' }}>{formatCurrency(storeQuota)}</span></div>
              {(() => {
                const pct = Math.min(((data?.summary?.totalAmount || 0) / (storeQuota || 1)) * 100, 100)
                return (
                  <div style={{ height: '18px', backgroundColor: '#1e293b', borderRadius: '9px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : pct >= 75 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #3b82f6, #2563eb)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.5s ease' }}>
                      {pct > 10 && <span style={{ fontSize: '9px', fontWeight: '600', color: '#fff' }}>%{pct.toFixed(1)}</span>}
                    </div>
                  </div>
                )
              })()}
            </div>
            {/* Bireysel Kota Grafiği */}
            <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #334155' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>👤 Bireysel Kota</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '0.5rem' }}>Kullanılan: <span style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(data?.summary?.totalAmount || 0)}</span> / <span style={{ color: '#10b981', fontWeight: '600' }}>{formatCurrency(userQuota)}</span></div>
              {(() => {
                const pct = Math.min(((data?.summary?.totalAmount || 0) / (userQuota || 1)) * 100, 100)
                return (
                  <div style={{ height: '18px', backgroundColor: '#1e293b', borderRadius: '9px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : pct >= 75 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #8b5cf6, #7c3aed)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.5s ease' }}>
                      {pct > 10 && <span style={{ fontSize: '9px', fontWeight: '600', color: '#fff' }}>%{pct.toFixed(1)}</span>}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* PERSONEL: Sadece Bireysel Kota */}
        {user.role === 'STAFF' && (
          <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #334155', marginBottom: '1rem' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>👤 Bireysel Aylık Kota</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '0.5rem' }}>Kullanılan: <span style={{ color: '#3b82f6', fontWeight: '600' }}>{formatCurrency(data?.summary?.totalAmount || 0)}</span> / <span style={{ color: '#10b981', fontWeight: '600' }}>{formatCurrency(userQuota)}</span></div>
            {(() => {
              const pct = Math.min(((data?.summary?.totalAmount || 0) / (userQuota || 1)) * 100, 100)
              return (
                <div style={{ height: '18px', backgroundColor: '#1e293b', borderRadius: '9px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'linear-gradient(90deg, #ef4444, #dc2626)' : pct >= 75 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #8b5cf6, #7c3aed)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.5s ease' }}>
                    {pct > 10 && <span style={{ fontSize: '9px', fontWeight: '600', color: '#fff' }}>%{pct.toFixed(1)}</span>}
                  </div>
                </div>
              )
            })()}
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '0.375rem' }}>
              Kalan: <span style={{ color: userQuota - (data?.summary?.totalAmount || 0) > 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>{formatCurrency(Math.max(userQuota - (data?.summary?.totalAmount || 0), 0))}</span>
            </div>
          </div>
        )}
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Toplam Satış', value: formatCurrency(data?.summary?.totalAmount || 0), icon: '💰', color: '#3b82f6' },
          { label: 'İşlem', value: data?.summary?.salesCount || 0, icon: '🧾', color: '#8b5cf6' },
          { label: 'Toplam Ürün', value: data?.summary?.totalItems || 0, icon: '📦', color: '#10b981' },
          { label: 'Ortalama', value: formatCurrency(data?.summary?.avgAmount || 0), icon: '📈', color: '#f59e0b' }
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1rem', border: '1px solid #334155', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-8px', right: '-8px', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{stat.icon}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '0.375rem' }}>{stat.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <DashboardCharts dailyStats={data?.dailyStats} staffStats={data?.staffStats} />
    </div>
  )
}
