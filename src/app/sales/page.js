'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatCurrency, formatCurrencyDecimal } from '@/lib/utils'
import SalesForm from '@/components/SalesForm'
import * as XLSX from 'xlsx'

export default function SalesPage() {
  const { user, loading: authLoading } = useAuth()
  const [sales, setSales] = useState([])
  const [filteredSales, setFilteredSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingSale, setEditingSale] = useState(null)
  const [sendingSale, setSendingSale] = useState(null)
  const [sendData, setSendData] = useState({ subject: '', description: '' })
  const [showSendModal, setShowSendModal] = useState(false)
  const [excelLoading, setExcelLoading] = useState(false)
  
  // Filtreler (yönetici/müdür için)
  const [allStaff, setAllStaff] = useState([])
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd] = useState('')
  const [filterStaff, setFilterStaff] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSeller, setSelectedSeller] = useState(null)

  useEffect(() => { if (user) { fetchSales(); if (canEdit) fetchStaffList(); setSelectedSeller(user) } }, [user])

  const fetchStaffList = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'user'))
      setAllStaff(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) { console.error(error) }
  }

  useEffect(() => {
    let result = [...sales]
    if (filterDateStart) result = result.filter(s => s.date >= filterDateStart)
    if (filterDateEnd) result = result.filter(s => s.date <= filterDateEnd)
    if (filterStaff) result = result.filter(s => s.userId === filterStaff)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s =>
        (s.customerPhone || '').toLowerCase().includes(q) ||
        (s.userName || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
      )
    }
    setFilteredSales(result)
  }, [sales, filterDateStart, filterDateEnd, filterStaff, searchQuery])

  if (authLoading) return <div className="px-4 py-6 max-w-7xl mx-auto"><div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>⏳ Yükleniyor...</div></div>
  if (!user) return <div className="px-4 py-6 max-w-7xl mx-auto"><div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>🔑 Lütfen giriş yapın</div></div>

  const canEdit = user.role === 'ADMIN' || user.role === 'MANAGER'

  const fetchSales = async () => {
    try {
      let salesQuery
      if (user.role === 'STAFF') {
        salesQuery = query(collection(db, 'sales'), where('userId', '==', user.uid), orderBy('date', 'desc'))
      } else if (user.role === 'MANAGER') {
        salesQuery = query(collection(db, 'sales'), where('storeId', '==', user.storeId), orderBy('date', 'desc'))
      } else {
        salesQuery = query(collection(db, 'sales'), orderBy('date', 'desc'))
      }
      const snapshot = await getDocs(salesQuery)
      setSales(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
  }

  const handleSubmit = async (formData) => {
    if (!user) { alert('Kullanıcı bilgisi bulunamadı.'); return }
    try {
      const seller = selectedSeller || user
      const saleData = { ...formData, amount: parseFloat(formData.amount) || 0, cost: parseFloat(formData.cost) || 0, itemCount: parseInt(formData.itemCount) || 0, bonusItemCount: parseInt(formData.bonusItemCount) || 0, userId: seller.id || user.uid, userName: seller.name || user.name || 'Bilinmeyen', storeId: seller.storeId || user.storeId || null, createdAt: new Date().toISOString() }
      if (editingSale) { await updateDoc(doc(db, 'sales', editingSale.id), saleData); setEditingSale(null) }
      else { await addDoc(collection(db, 'sales'), saleData) }
      fetchSales()
    } catch (error) { alert('Kaydedilemedi: ' + error.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return
    try { await deleteDoc(doc(db, 'sales', id)); fetchSales() } catch (error) { alert('Silinemedi: ' + error.message) }
  }

  const handleSend = (sale) => { setSendingSale(sale); setSendData({ subject: '', description: '' }); setShowSendModal(true) }

  const handleSendSubmit = async () => {
    if (!sendData.subject || !sendData.description) { alert('Konu ve açıklama zorunludur!'); return }
    try {
      await updateDoc(doc(db, 'sales', sendingSale.id), { sentBy: user.name || user.email, sentSubject: sendData.subject, sentDescription: sendData.description, sentAt: new Date().toISOString() })
      setSendingSale(null); setSendData({ subject: '', description: '' }); fetchSales(); alert('Mesajınız başarıyla gönderildi!')
    } catch (error) { alert('Gönderilemedi: ' + error.message) }
  }

  const handleEdit = (sale) => { setEditingSale(sale) }

  const handleSaveEdit = async (formData) => {
    if (!formData) return
    try {
      const saleData = { ...formData, amount: parseFloat(formData.amount) || 0, cost: parseFloat(formData.cost) || 0, itemCount: parseInt(formData.itemCount) || 0, bonusItemCount: parseInt(formData.bonusItemCount) || 0, userId: editingSale.userId, userName: editingSale.userName, storeId: editingSale.storeId, lastEditedBy: user.name || user.email, lastEditNote: 'Düzenlendi', lastEditedAt: new Date().toISOString() }
      await updateDoc(doc(db, 'sales', editingSale.id), saleData)
      setEditingSale(null); fetchSales(); alert('Satış başarıyla güncellendi!')
    } catch (error) { alert('Güncellenemedi: ' + error.message) }
  }

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setExcelLoading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)
      let imported = 0
      const BATCH_SIZE = 500
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = writeBatch(db)
        const chunk = rows.slice(i, i + BATCH_SIZE)
        for (const row of chunk) {
          const amount = parseFloat(row['Tutar'] || row['tutar'] || row['Amount'] || row['amount'] || 0)
          if (amount <= 0) continue
          const newRef = doc(collection(db, 'sales'))
          batch.set(newRef, {
            date: row['Tarih'] || row['tarih'] || row['Date'] || row['date'] || new Date().toISOString().split('T')[0],
            hour: String(row['Saat'] || row['saat'] || row['Hour'] || row['hour'] || 9),
            amount,
            cost: parseFloat(row['Maliyet'] || row['maliyet'] || row['Cost'] || row['cost'] || 0),
            itemCount: parseInt(row['Ürün Sayısı'] || row['urunSayisi'] || row['Items'] || row['items'] || 0),
            bonusItemCount: parseInt(row['Bonus'] || row['bonus'] || 0),
            customerPhone: row['Müşteri'] || row['musteri'] || row['Customer'] || '',
            category: row['Kategori'] || row['kategori'] || row['Category'] || 'Giriş kat',
            userId: user.uid,
            userName: user.name || user.email || 'Bilinmeyen',
            storeId: user.storeId || null,
            createdAt: new Date().toISOString()
          })
          imported++
        }
        await batch.commit()
      }
      alert(`${imported} satış başarıyla içe aktarıldı!`)
      fetchSales()
    } catch (error) {
      alert('İçe aktarma hatası: ' + error.message)
    } finally {
      setExcelLoading(false)
      e.target.value = ''
    }
  }
  const today = new Date().toISOString().split('T')[0]
  const todaySales = sales.filter(s => s.date && s.date.startsWith(today))
  const totalToday = todaySales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)

  const displaySales = canEdit ? filteredSales : sales

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>💰 Satış Giriş</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Günlük satışlarınızı kaydedin</p>
      </div>

      {/* Yeni Satış Formu */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>{editingSale ? '✏️ Satışı Düzenle' : '➕ Yeni Satış Ekle'}</h2>

        {/* Satıcı Seçimi (Admin/Müdür) */}
        {canEdit && !editingSale && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '0.75rem', border: '1px solid #334155' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.375rem' }}>👤 Bu satışı kime yazalım?</label>
            <select value={selectedSeller?.id || ''} onChange={(e) => {
              const s = allStaff.find(s => s.id === e.target.value)
              setSelectedSeller(s || user)
            }} style={{ width: '100%', padding: '0.625rem', borderRadius: '0.5rem', fontSize: '13px', backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }}>
              {allStaff.map(s => (
                <option key={s.id} value={s.id}>{s.name} {s.id === user.uid ? '(Ben)' : ''} — {s.role === 'ADMIN' ? 'Yönetici' : s.role === 'MANAGER' ? 'Müdür' : 'Personel'}</option>
              ))}
            </select>
            {selectedSeller && selectedSeller.id !== user.uid && (
              <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '0.375rem', fontWeight: '600' }}>
                ⚠️ {selectedSeller.name} adına satış kaydedilecek
              </div>
            )}
          </div>
        )}

        <SalesForm onSubmit={editingSale ? handleSaveEdit : handleSubmit} initialData={editingSale} />
        {editingSale && <button onClick={() => setEditingSale(null)} style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#334155', color: '#94a3b8', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>✕ İptal</button>}
      </div>

      {/* Filtreler (Yönetici/Müdür) */}
      {canEdit && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>🔍 Filtreler</h3>
          <div style={{ marginBottom: '0.75rem' }}>
            <input type="text" placeholder="🔍 Müşteri no, isim veya kategori ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', fontSize: '13px', backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Başlangıç Tarihi</label>
              <input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px', backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Bitiş Tarihi</label>
              <input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px', backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Satıcı</label>
              <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px', backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }}>
                <option value="">Tümü</option>
                {allStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={() => { setFilterDateStart(''); setFilterDateEnd(''); setFilterStaff('') }}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}>
                ✕ Temizle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hızlı Özet */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>📋 Son Satışlar</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Bugün', value: formatCurrency(totalToday), icon: '📅', color: '#3b82f6' },
            { label: 'İşlem', value: todaySales.length, icon: '🧾', color: '#8b5cf6' },
            { label: 'Toplam', value: formatCurrency(displaySales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)), icon: '💰', color: '#10b981' },
            { label: 'İadeler', value: formatCurrency(Math.abs(displaySales.filter(s => (parseFloat(s.amount) || 0) < 0).reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0))), icon: '↩️', color: '#ef4444' }
          ].map((stat, i) => (
            <div key={i} style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '0.75rem', border: '1px solid #334155', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', marginBottom: '0.25rem' }}>{stat.icon}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '0.25rem' }}>{stat.label}</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Toplam', value: formatCurrency(displaySales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)), color: '#10b981' },
          { label: 'İşlem', value: displaySales.length, color: '#3b82f6' },
          { label: 'Ortalama', value: displaySales.length > 0 ? formatCurrency(displaySales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) / displaySales.length) : '0 TL', color: '#f59e0b' }
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value" style={{ color: stat.color, fontSize: '14px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Satış Geçmişi */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>📋 Satış Geçmişi</h3>
          {canEdit && (
            <label style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', fontSize: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', cursor: 'pointer', fontWeight: '600' }}>
              📁 {excelLoading ? 'Yükleniyor...' : 'Excel Yükle'}
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} style={{ display: 'none' }} disabled={excelLoading} />
            </label>
          )}
        </div>
        {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>⏳ Yükleniyor...</div>
        : displaySales.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>📭 Kayıt bulunamadı</div>
        : (
          <div className="space-y-3">
            {displaySales.map(sale => {
              const isNegative = parseFloat(sale.amount) < 0
              return (
                <div key={sale.id} style={{ backgroundColor: '#0f172a', borderRadius: '0.5rem', padding: '0.875rem', borderLeft: `4px solid ${isNegative ? '#ef4444' : '#3b82f6'}`, marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: isNegative ? '#ef4444' : '#3b82f6' }}>
                        {isNegative ? '❌ ' : ''}{formatCurrencyDecimal(sale.amount || 0)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '0.25rem' }}>
                        {sale.date ? new Date(sale.date).toLocaleDateString('tr-TR') : ''} • {sale.hour !== undefined ? `${String(sale.hour).padStart(2, '0')}:00` : ''} • {sale.userName || '-'}
                      </div>
                      {(sale.itemCount > 0 || sale.bonusItemCount > 0) && (
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '0.25rem' }}>
                          📦 {sale.itemCount || 0} ürün{sale.bonusItemCount > 0 ? ` • 🎁 ${sale.bonusItemCount} bonus` : ''}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '10px', backgroundColor: isNegative ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: isNegative ? '#fca5a5' : '#93c5fd' }}>
                        {isNegative ? '🚫 İptal' : sale.category || '-'}
                      </span>
                      {canEdit ? (
                        <>
                          <button onClick={() => handleEdit(sale)} style={{ padding: '0.375rem 0.625rem', borderRadius: '0.375rem', fontSize: '11px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'none', cursor: 'pointer' }}>✏️</button>
                          <button onClick={() => handleDelete(sale.id)} style={{ padding: '0.375rem 0.625rem', borderRadius: '0.375rem', fontSize: '11px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>🗑️</button>
                        </>
                      ) : (
                        <button onClick={() => handleSend(sale)} style={{ padding: '0.375rem 0.625rem', borderRadius: '0.375rem', fontSize: '11px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'none', cursor: 'pointer' }}>📨 Gönder</button>
                      )}
                    </div>
                  </div>
                  {sale.lastEditedBy && <div style={{ fontSize: '10px', color: '#f59e0b' }}>✏️ {sale.lastEditedBy} tarafından düzenlendi</div>}
                  {sale.sentBy && <div style={{ fontSize: '10px', color: '#10b981' }}>📨 {sale.sentBy} gönderdi</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Gönderme Modalı */}
      {showSendModal && sendingSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: '400px', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📨 Satış Gönder</h3>
            <div style={{ backgroundColor: '#0f172a', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '14px', color: '#f8fafc' }}>{formatCurrencyDecimal(sendingSale.amount || 0)} - {sendingSale.category}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{sendingSale.date} • {sendingSale.hour}:00</div>
            </div>
            <div className="form-group"><label className="form-label">📋 Konu *</label><input type="text" value={sendData.subject} onChange={(e) => setSendData(p => ({ ...p, subject: e.target.value }))} placeholder="Mesaj konusu" className="form-input" required /></div>
            <div className="form-group"><label className="form-label">📝 Açıklama *</label><textarea value={sendData.description} onChange={(e) => setSendData(p => ({ ...p, description: e.target.value }))} placeholder="Mesajınızı yazın..." className="form-input" rows={3} required /></div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button onClick={() => { setSendingSale(null); setSendData({ subject: '', description: '' }) }} className="btn btn-secondary" style={{ flex: 1 }}>İptal</button>
              <button onClick={handleSendSubmit} className="btn btn-primary" style={{ flex: 1 }}>📨 Gönder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
