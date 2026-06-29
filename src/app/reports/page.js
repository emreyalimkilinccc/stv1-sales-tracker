'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatCurrency, formatCurrencyDecimal } from '@/lib/utils'

export default function ReportsPage() {
  const { user } = useAuth()
  const [pendingSales, setPendingSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState(null)
  const [responseNote, setResponseNote] = useState('')

  useEffect(() => { if (user && user.role !== 'STAFF') fetchPendingSales() }, [user])

  const fetchPendingSales = async () => {
    try {
      let salesQuery
      if (user.role === 'MANAGER') {
        salesQuery = query(collection(db, 'sales'), where('storeId', '==', user.storeId), where('sentBy', '!=', null), orderBy('sentAt', 'desc'))
      } else {
        salesQuery = query(collection(db, 'sales'), where('sentBy', '!=', null), orderBy('sentAt', 'desc'))
      }
      const snapshot = await getDocs(salesQuery)
      const sales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      // Düzenlenmiş olanları filtrele (lastEditedBy varsa yönetici düzeltmiş demektir)
      const pending = sales.filter(s => !s.lastEditedBy)
      setPendingSales(pending)
    } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
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
      alert('Satış onaylandı ve raporlar sayfasından kaldırıldı!')
    } catch (error) { alert('Hata: ' + error.message) }
  }

  if (!user || user.role === 'STAFF') return <div className="min-h-screen flex items-center justify-center"><div>🚫 Erişim yetkiniz yok</div></div>
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>📨 Düzeltme İstekleri</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Personelin gönderdiği düzeltme isteklerini görüntüleyin</p>
      </div>

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
