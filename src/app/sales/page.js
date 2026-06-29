'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatCurrency, formatCurrencyDecimal } from '@/lib/utils'
import SalesForm from '@/components/SalesForm'

export default function SalesPage() {
  const { user, loading: authLoading } = useAuth()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingSale, setEditingSale] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editData, setEditData] = useState({ date: '', hour: '', amount: '', category: '', editorName: '', note: '' })
  const [sendingSale, setSendingSale] = useState(null)
  const [sendData, setSendData] = useState({ subject: '', description: '' })
  const [showSendModal, setShowSendModal] = useState(false)

  useEffect(() => { if (user) fetchSales() }, [user])

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
      const saleData = { ...formData, amount: parseFloat(formData.amount) || 0, itemCount: parseInt(formData.itemCount) || 0, userId: user.uid, userName: user.name || user.email || 'Bilinmeyen', storeId: user.storeId || null, createdAt: new Date().toISOString() }
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

  const handleEdit = (sale) => { setEditData({ date: sale.date || '', hour: String(sale.hour || ''), amount: sale.amount || '', category: sale.category || '', editorName: user.name || '', note: '' }); setEditingSale(sale); setShowEditModal(true) }

  const handleSaveEdit = async () => {
    if (!editData.editorName || !editData.note) { alert('Düzenleyen kişi adı ve not zorunludur!'); return }
    try {
      await updateDoc(doc(db, 'sales', editingSale.id), { date: editData.date, hour: parseInt(editData.hour) || 0, amount: parseFloat(editData.amount) || 0, category: editData.category, lastEditedBy: editData.editorName, lastEditNote: editData.note, lastEditedAt: new Date().toISOString() })
      setShowEditModal(false); setEditingSale(null); setEditData({ date: '', hour: '', amount: '', category: '', editorName: '', note: '' }); fetchSales(); alert('Satış başarıyla güncellendi!')
    } catch (error) { alert('Güncellenemedi: ' + error.message) }
  }

  const today = new Date().toISOString().split('T')[0]
  const todaySales = sales.filter(s => s.date && s.date.startsWith(today))
  const totalToday = todaySales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>💰 Satış Giriş</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Günlük satışlarınızı kaydedin</p>
      </div>

      <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Toplam', value: formatCurrency(totalToday), color: '#10b981' },
          { label: 'İşlem', value: todaySales.length, color: '#3b82f6' },
          { label: 'Ortalama', value: todaySales.length > 0 ? formatCurrency(totalToday / todaySales.length) : '0 TL', color: '#f59e0b' }
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value" style={{ color: stat.color, fontSize: '16px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>{editingSale ? '✏️ Satışı Düzenle' : '➕ Yeni Satış Ekle'}</h2>
        <SalesForm onSubmit={handleSubmit} initialData={editingSale} />
        {editingSale && <button onClick={() => setEditingSale(null)} className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>✕ İptal</button>}
      </div>

      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📋 Satış Geçmişi</h3>
        {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>⏳ Yükleniyor...</div>
        : sales.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}><div style={{ fontSize: '48px', marginBottom: '0.75rem' }}>📭</div>Henüz satış kaydı yok</div>
        : (
          <div className="space-y-3">
            {sales.map(sale => {
              const isNegative = parseFloat(sale.amount) < 0
              return (
                <div key={sale.id} className="list-item" style={{ borderLeft: `4px solid ${isNegative ? '#ef4444' : '#3b82f6'}`, backgroundColor: isNegative ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
                  <div className="flex justify-between items-start" style={{ marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: isNegative ? '#ef4444' : '#3b82f6' }}>
                        {isNegative ? '❌ ' : ''}{formatCurrencyDecimal(sale.amount || 0)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.25rem' }}>
                        {sale.date ? new Date(sale.date).toLocaleDateString('tr-TR') : ''} • {sale.hour !== undefined ? `${String(sale.hour).padStart(2, '0')}:00` : ''}
                      </div>
                    </div>
                    <div style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '11px', fontWeight: '500', backgroundColor: isNegative ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: isNegative ? '#fca5a5' : '#93c5fd' }}>
                      {isNegative ? '🚫 İptal/İade' : sale.category || '-'}
                    </div>
                  </div>
                  <div className="flex justify-between items-center" style={{ borderTop: '1px solid #334155', paddingTop: '0.75rem' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      📦 {sale.itemCount || 0} ürün {sale.customerPhone ? `• 👤 ${sale.customerPhone}` : ''}
                      {sale.lastEditedBy && <div style={{ marginTop: '0.25rem', color: '#f59e0b', fontSize: '11px' }}>✏️ {sale.lastEditedBy} tarafından düzenlendi {sale.lastEditNote && `- ${sale.lastEditNote}`}</div>}
                      {sale.sentBy && <div style={{ marginTop: '0.25rem', color: '#10b981', fontSize: '11px' }}>📨 {sale.sentBy} tarafından gönderildi {sale.sentSubject && `- ${sale.sentSubject}`}</div>}
                    </div>
                    {canEdit ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleEdit(sale)} style={{ padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontSize: '12px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'none', cursor: 'pointer', fontWeight: '500' }}>✏️ Düzenle</button>
                        <button onClick={() => handleDelete(sale.id)} style={{ padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontSize: '12px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: '500' }}>🗑️ Sil</button>
                      </div>
                    ) : (
                      <button onClick={() => handleSend(sale)} style={{ padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontSize: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'none', cursor: 'pointer', fontWeight: '500' }}>📨 Gönder</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: '400px', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>✏️ Satış Düzenle</h3>
            <div className="form-group"><label className="form-label">📅 Tarih</label><input type="date" value={editData.date} onChange={(e) => setEditData(p => ({ ...p, date: e.target.value }))} className="form-input" /></div>
            <div className="form-group"><label className="form-label">⏰ Saat</label><select value={editData.hour} onChange={(e) => setEditData(p => ({ ...p, hour: e.target.value }))} className="form-input">{Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</option>)}</select></div>
            <div className="form-group"><label className="form-label">💰 Tutar (TL)</label><input type="number" value={editData.amount} onChange={(e) => setEditData(p => ({ ...p, amount: e.target.value }))} className="form-input" /></div>
            <div className="form-group"><label className="form-label">🏷️ Kategori</label><select value={editData.category} onChange={(e) => setEditData(p => ({ ...p, category: e.target.value }))} className="form-input"><option value="Giriş kat">🚪 Giriş kat</option><option value="Züccaciye">🍳 Züccaciye</option><option value="Kasa">🗄️ Kasa</option><option value="Mobilya">🛋️ Mobilya</option></select></div>
            <div className="form-group"><label className="form-label">👤 Düzenleyen Kişi *</label><input type="text" value={editData.editorName} onChange={(e) => setEditData(p => ({ ...p, editorName: e.target.value }))} placeholder="Adınız Soyadınız" className="form-input" required /></div>
            <div className="form-group"><label className="form-label">📝 Düzenleme Notu *</label><textarea value={editData.note} onChange={(e) => setEditData(p => ({ ...p, note: e.target.value }))} placeholder="Düzenleme sebebinizi yazın..." className="form-input" rows={3} required /></div>
            <div className="flex" style={{ gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => { setShowEditModal(false); setEditingSale(null) }} className="btn btn-secondary flex-1">İptal</button>
              <button type="button" onClick={handleSaveEdit} className="btn btn-primary flex-1">💾 Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {sendingSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: '400px', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📨 Satış Gönder</h3>
            <div style={{ backgroundColor: '#0f172a', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '14px', color: '#f8fafc' }}>{formatCurrencyDecimal(sendingSale.amount || 0)} - {sendingSale.category}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{sendingSale.date} • {sendingSale.hour}:00</div>
            </div>
            <div className="form-group"><label className="form-label">📋 Konu *</label><input type="text" value={sendData.subject} onChange={(e) => setSendData(p => ({ ...p, subject: e.target.value }))} placeholder="Mesaj konusu" className="form-input" required /></div>
            <div className="form-group"><label className="form-label">📝 Açıklama *</label><textarea value={sendData.description} onChange={(e) => setSendData(p => ({ ...p, description: e.target.value }))} placeholder="Mesajınızı yazın..." className="form-input" rows={4} required /></div>
            <div className="flex" style={{ gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" onClick={() => { setSendingSale(null) }} className="btn btn-secondary flex-1">İptal</button>
              <button type="button" onClick={handleSendSubmit} className="btn btn-primary flex-1">📨 Gönder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
