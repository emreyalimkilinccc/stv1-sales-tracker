'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/Toast'

export default function MusterilerPage() {
  const { user, loading: authLoading } = useAuth()
  const toast = useToast()
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [purchaseHistory, setPurchaseHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', note: '' })

  useEffect(() => { if (user) fetchCustomers() }, [user])

  useEffect(() => {
    let result = [...customers]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      )
    }
    setFilteredCustomers(result)
  }, [customers, searchQuery])

  if (authLoading) return <div className="px-4 py-6 max-w-7xl mx-auto"><div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>⏳ Yükleniyor...</div></div>
  if (!user) return <div className="px-4 py-6 max-w-7xl mx-auto"><div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>🔑 Lütfen giriş yapın</div></div>

  const canEdit = user.role === 'ADMIN' || user.role === 'MANAGER'

  const fetchCustomers = async () => {
    try {
      let q
      if (user.role === 'STAFF') {
        q = query(collection(db, 'customers'), where('createdBy', '==', user.uid), orderBy('createdAt', 'desc'))
      } else {
        q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'))
      }
      const snapshot = await getDocs(q)
      setCustomers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) {
      console.error(error)
    } finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) { toast.warning('Müşteri adı zorunludur!'); return }
    try {
      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), { ...formData, updatedAt: new Date().toISOString() })
        toast.success('Müşteri güncellendi!')
      } else {
        await addDoc(collection(db, 'customers'), {
          ...formData,
          createdBy: user.uid,
          createdByName: user.name || user.email,
          storeId: user.storeId || null,
          createdAt: new Date().toISOString()
        })
        toast.success('Müşteri eklendi!')
      }
      setShowModal(false)
      setEditingCustomer(null)
      setFormData({ name: '', phone: '', email: '', address: '', note: '' })
      fetchCustomers()
    } catch (error) { toast.error('İşlem başarısız: ' + error.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return
    try {
      await deleteDoc(doc(db, 'customers', id))
      toast.success('Müşteri silindi!')
      fetchCustomers()
    } catch (error) { toast.error('Silinemedi: ' + error.message) }
  }

  const handleEdit = (customer) => {
    setEditingCustomer(customer)
    setFormData({ name: customer.name || '', phone: customer.phone || '', email: customer.email || '', address: customer.address || '', note: customer.note || '' })
    setShowModal(true)
  }

  const viewHistory = async (customer) => {
    setSelectedCustomer(customer)
    setHistoryLoading(true)
    try {
      const q = query(collection(db, 'sales'), where('customerPhone', '==', customer.phone || ''), orderBy('date', 'desc'))
      const snapshot = await getDocs(q)
      setPurchaseHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) {
      console.error(error)
      setPurchaseHistory([])
    } finally { setHistoryLoading(false) }
  }

  const totalSpent = purchaseHistory.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>👥 Müşteriler</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Müşteri yönetimi ve satın alma geçmişi</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Toplam Müşteri', value: customers.length, icon: '👥', color: '#8b5cf6' },
          { label: 'Bu Ay', value: customers.filter(c => {
            const d = new Date(c.createdAt)
            const now = new Date()
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
          }).length, icon: '📅', color: '#3b82f6' },
          { label: 'Aktif', value: customers.filter(c => c.phone).length, icon: '📱', color: '#10b981' },
          { label: 'Kayıtlı', value: customers.filter(c => c.email).length, icon: '📧', color: '#f59e0b' }
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1rem', border: '1px solid #334155', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', marginBottom: '0.25rem' }}>{stat.icon}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '0.25rem' }}>{stat.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Search & Add */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input type="text" placeholder="🔍 İsim, telefon veya e-posta ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '0.625rem 1rem', borderRadius: '0.75rem', fontSize: '14px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc' }} />
        {canEdit && (
          <button onClick={() => { setEditingCustomer(null); setFormData({ name: '', phone: '', email: '', address: '', note: '' }); setShowModal(true) }}
            className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            ➕ Yeni Müşteri
          </button>
        )}
      </div>

      {/* Customer List */}
      <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📋 Müşteri Listesi</h3>
        {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>⏳ Yükleniyor...</div>
        : filteredCustomers.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>📭 Müşteri bulunamadı</div>
        : (
          <div>
            {filteredCustomers.map(customer => (
              <div key={customer.id} style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #334155', marginBottom: '0.75rem', borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', marginBottom: '0.25rem' }}>{customer.name}</div>
                    {customer.phone && <div style={{ fontSize: '13px', color: '#94a3b8' }}>📱 {customer.phone}</div>}
                    {customer.email && <div style={{ fontSize: '13px', color: '#94a3b8' }}>📧 {customer.email}</div>}
                    {customer.address && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>📍 {customer.address}</div>}
                    {customer.note && <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '0.25rem' }}>📝 {customer.note}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={() => viewHistory(customer)} style={{ padding: '0.375rem 0.625rem', borderRadius: '0.375rem', fontSize: '11px', backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', border: 'none', cursor: 'pointer' }}>📜 Geçmiş</button>
                    {canEdit && (
                      <>
                        <button onClick={() => handleEdit(customer)} style={{ padding: '0.375rem 0.625rem', borderRadius: '0.375rem', fontSize: '11px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'none', cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => handleDelete(customer.id)} style={{ padding: '0.375rem 0.625rem', borderRadius: '0.375rem', fontSize: '11px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>🗑️</button>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: '#475569', marginTop: '0.5rem' }}>
                  {customer.createdByName && `👤 ${customer.createdByName} • `}
                  {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('tr-TR') : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: '420px', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>{editingCustomer ? '✏️ Müşteri Düzenle' : '➕ Yeni Müşteri'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>👤 İsim *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Müşteri adı" className="form-input" required />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>📱 Telefon</label>
                <input type="tel" value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="05XX XXX XX XX" className="form-input" />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>📧 E-posta</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="ornek@email.com" className="form-input" />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>📍 Adres</label>
                <input type="text" value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Adres bilgisi" className="form-input" />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>📝 Not</label>
                <textarea value={formData.note} onChange={(e) => setFormData(p => ({ ...p, note: e.target.value }))} placeholder="Ek notlar..." className="form-input" rows={2} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => { setShowModal(false); setEditingCustomer(null) }} className="btn btn-secondary" style={{ flex: 1 }}>İptal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingCustomer ? 'Güncelle' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase History Modal */}
      {selectedCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc' }}>📜 Satın Alma Geçmişi</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8' }}>{selectedCustomer.name}</p>
              </div>
              <button onClick={() => { setSelectedCustomer(null); setPurchaseHistory([]) }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            {historyLoading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>⏳ Yükleniyor...</div>
            : purchaseHistory.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>📭 Satış kaydı bulunamadı</div>
            : (
              <>
                <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem', border: '1px solid #334155', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>Toplam Harcama</div>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: '#10b981' }}>{formatCurrency(totalSpent)}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.25rem' }}>{purchaseHistory.length} işlem</div>
                </div>
                {purchaseHistory.map(sale => (
                  <div key={sale.id} style={{ backgroundColor: '#0f172a', borderRadius: '0.5rem', padding: '0.75rem', borderLeft: `4px solid ${(parseFloat(sale.amount) || 0) < 0 ? '#ef4444' : '#3b82f6'}`, marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>{formatCurrency(sale.amount || 0)}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{sale.date || ''}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '0.25rem' }}>
                      {sale.category || ''} {sale.userName ? `• ${sale.userName}` : ''}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
