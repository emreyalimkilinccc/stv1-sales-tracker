'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatCurrency, formatCurrencyDecimal } from '@/lib/utils'
import { useToast } from '@/components/Toast'

export default function ReportsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [pendingSales, setPendingSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState(null)
  const [responseNote, setResponseNote] = useState('')
  const [weeklyStats, setWeeklyStats] = useState(null)

  useEffect(() => { if (user && user.role !== 'STAFF') { fetchPendingSales(); fetchWeeklyStats() } }, [user])

  const fetchPendingSales = async () => {
    try {
      // Tüm satışları çek
      const salesQuery = query(collection(db, 'sales'), orderBy('date', 'desc'))
      const snapshot = await getDocs(salesQuery)
      const allSales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      
      // Gönderilmiş satışları filtrele (sentBy alanı varsa)
      let pending = allSales.filter(s => {
        return s.sentBy && s.sentBy.trim() !== ''
      })
      
      // Düzenlenmiş olanları çıkar (lastEditedBy alanı varsa)
      pending = pending.filter(s => !s.lastEditedBy)
      
      // Mağaza müdürü ise sadece kendi mağazasını görsün
      if (user.role === 'MANAGER') {
        pending = pending.filter(s => s.storeId === user.storeId || !s.storeId)
      }
      
      setPendingSales(pending)
    } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
  }

  const fetchWeeklyStats = async () => {
    try {
      const now = new Date()
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      const twoWeeksAgo = new Date(now)
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

      let salesQuery
      if (user.role === 'MANAGER') {
        salesQuery = query(collection(db, 'sales'), where('storeId', '==', user.storeId))
      } else {
        salesQuery = query(collection(db, 'sales'))
      }
      const snapshot = await getDocs(salesQuery)
      const allSales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))

      const thisWeek = allSales.filter(s => { const d = new Date(s.date); return d >= weekAgo && d <= now })
      const lastWeek = allSales.filter(s => { const d = new Date(s.date); return d >= twoWeeksAgo && d < weekAgo })

      const thisWeekTotal = thisWeek.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
      const lastWeekTotal = lastWeek.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
      const thisWeekProfit = thisWeek.reduce((sum, s) => sum + ((parseFloat(s.amount) || 0) - (parseFloat(s.cost) || 0)), 0)
      const thisWeekItems = thisWeek.reduce((sum, s) => sum + (parseInt(s.itemCount) || 0) + (parseInt(s.bonusItemCount) || 0), 0)

      const changePercent = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal * 100) : 0

      const catData = thisWeek.reduce((acc, s) => {
        const cat = s.category || 'Diğer'
        acc[cat] = (acc[cat] || 0) + (parseFloat(s.amount) || 0)
        return acc
      }, {})
      const topCategory = Object.entries(catData).sort((a, b) => b[1] - a[1])[0]

      const staffData = thisWeek.reduce((acc, s) => {
        acc[s.userName || 'Bilinmeyen'] = (acc[s.userName || 'Bilinmeyen'] || 0) + (parseFloat(s.amount) || 0)
        return acc
      }, {})
      const topStaff = Object.entries(staffData).sort((a, b) => b[1] - a[1])[0]

      setWeeklyStats({
        thisWeekTotal, lastWeekTotal, thisWeekProfit, thisWeekItems,
        changePercent, topCategory: topCategory ? topCategory[0] : '-',
        topStaff: topStaff ? topStaff[0] : '-',
        salesCount: thisWeek.length
      })
    } catch (error) { console.error('Weekly stats error:', error) }
  }

  const handleApprove = async (sale) => {
    try {
      await updateDoc(doc(db, 'sales', sale.id), {
        lastEditedBy: user.name || user.email,
        lastEditNote: responseNote || 'Onaylandı - düzeltme yapıldı',
        lastEditedAt: new Date().toISOString()
      })
      setResponseNote('')
      fetchPendingSales()
      toast.success('Satış onaylandı ve raporlar sayfasından kaldırıldı!')
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  if (!user || user.role === 'STAFF') return <div className="min-h-screen flex items-center justify-center"><div>🚫 Erişim yetkiniz yok</div></div>
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>📨 Raporlar</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Haftalık özet ve düzeltme istekleri</p>
      </div>

      {/* Haftalık Özet */}
      {weeklyStats && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📊 Son 7 Gün Özeti</h3>
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '0.875rem', border: '1px solid #334155' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '0.25rem' }}>Bu Hafta</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6' }}>{formatCurrency(weeklyStats.thisWeekTotal)}</div>
              <div style={{ fontSize: '11px', color: weeklyStats.changePercent >= 0 ? '#10b981' : '#ef4444', marginTop: '0.25rem' }}>
                {weeklyStats.changePercent >= 0 ? '📈' : '📉'} %{Math.abs(weeklyStats.changePercent).toFixed(1)} {weeklyStats.changePercent >= 0 ? 'artış' : 'düşüş'}
              </div>
            </div>
            <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '0.875rem', border: '1px solid #334155' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '0.25rem' }}>Kâr</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>{formatCurrency(weeklyStats.thisWeekProfit)}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '0.25rem' }}>{weeklyStats.salesCount} işlem</div>
            </div>
            <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '0.875rem', border: '1px solid #334155' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '0.25rem' }}>En Çok Satan Kategori</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#f59e0b' }}>{weeklyStats.topCategory}</div>
            </div>
            <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '0.875rem', border: '1px solid #334155' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '0.25rem' }}>En İyi Personel</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#8b5cf6' }}>{weeklyStats.topStaff}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '0.25rem' }}>{weeklyStats.thisWeekItems} ürün satıldı</div>
            </div>
          </div>
        </div>
      )}

      {pendingSales.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '0.75rem' }}>✅</div>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Bekleyen düzeltme isteği yok</p>
          <p style={{ color: '#64748b', fontSize: '12px', marginTop: '0.5rem' }}>Personel satış düzeltme gönderdiğinde burada görünecek</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingSales.map(sale => (
            <div key={sale.id} className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <div className="flex justify-between items-start" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b' }}>
                    {formatCurrencyDecimal(sale.amount || 0)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {sale.date ? new Date(sale.date).toLocaleDateString('tr-TR') : ''} • {sale.hour !== undefined ? `${String(sale.hour).padStart(2, '0')}:00` : ''}
                  </div>
                  <div style={{ fontSize: '12px', color: '#93c5fd', marginTop: '0.25rem' }}>
                    👤 {sale.userName || 'Bilinmeyen'} • 📦 {sale.itemCount || 0} ürün
                  </div>
                </div>
                <div style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '11px', fontWeight: '500', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fcd34d' }}>
                  {sale.category || '-'}
                </div>
              </div>

              {/* Gönderilen Mesaj */}
              <div style={{ backgroundColor: '#0f172a', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.75rem', borderLeft: '3px solid #f59e0b' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '0.25rem' }}>
                  📨 <span style={{ color: '#f59e0b', fontWeight: '600' }}>{sale.sentBy}</span> tarafından gönderildi
                </div>
                {sale.sentSubject && (
                  <div style={{ fontSize: '13px', color: '#f8fafc', fontWeight: '600', marginBottom: '0.25rem' }}>
                    Konu: {sale.sentSubject}
                  </div>
                )}
                {sale.sentDescription && (
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {sale.sentDescription}
                  </div>
                )}
              </div>

              {/* Yanıt Formu */}
              <div className="form-group">
                <label className="form-label">📝 Yanıt / Düzeltme Notu</label>
                <textarea
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  placeholder="Düzeltme açıklamanızı yazın..."
                  className="form-input"
                  rows={2}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button onClick={() => handleApprove(sale)} className="btn btn-primary" style={{ flex: 1 }}>
                  ✅ Düzenle ve Onayla
                </button>
                <button onClick={() => { setSelectedSale(null); setResponseNote('') }} className="btn btn-secondary" style={{ flex: 1 }}>
                  ❌ İptal
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
