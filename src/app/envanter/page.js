'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/Toast'

export default function EnvanterPage() {
  const { user, loading: authLoading } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStock, setFilterStock] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({ name: '', sku: '', category: '', quantity: '', minStock: '', price: '', cost: '', location: '', description: '' })

  useEffect(() => { if (user) fetchItems() }, [user])

  useEffect(() => {
    let result = [...items]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(i =>
        (i.name || '').toLowerCase().includes(q) ||
        (i.sku || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q)
      )
    }
    if (filterCategory) result = result.filter(i => i.category === filterCategory)
    if (filterStock === 'low') result = result.filter(i => (parseInt(i.quantity) || 0) <= (parseInt(i.minStock) || 0))
    if (filterStock === 'out') result = result.filter(i => (parseInt(i.quantity) || 0) === 0)
    if (filterStock === 'ok') result = result.filter(i => (parseInt(i.quantity) || 0) > (parseInt(i.minStock) || 0))
    setFilteredItems(result)
  }, [items, searchQuery, filterCategory, filterStock])

  if (authLoading) return <div className="px-4 py-6 max-w-7xl mx-auto"><div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>⏳ Yükleniyor...</div></div>
  if (!user) return <div className="px-4 py-6 max-w-7xl mx-auto"><div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>🔑 Lütfen giriş yapın</div></div>

  const canEdit = user.role === 'ADMIN' || user.role === 'MANAGER'

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))]

  const fetchItems = async () => {
    try {
      let q
      if (user.role === 'STAFF') {
        q = query(collection(db, 'inventory'), where('storeId', '==', user.storeId || ''), orderBy('name'))
      } else {
        q = query(collection(db, 'inventory'), orderBy('name'))
      }
      const snapshot = await getDocs(q)
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) {
      console.error(error)
    } finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) { toast.warning('Ürün adı zorunludur!'); return }
    try {
      const data = {
        ...formData,
        quantity: parseInt(formData.quantity) || 0,
        minStock: parseInt(formData.minStock) || 0,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0
      }
      if (editingItem) {
        await updateDoc(doc(db, 'inventory', editingItem.id), { ...data, updatedAt: new Date().toISOString() })
        toast.success('Ürün güncellendi!')
      } else {
        await addDoc(collection(db, 'inventory'), {
          ...data,
          createdBy: user.uid,
          createdByName: user.name || user.email,
          storeId: user.storeId || null,
          createdAt: new Date().toISOString()
        })
        toast.success('Ürün eklendi!')
      }
      setShowModal(false)
      setEditingItem(null)
      setFormData({ name: '', sku: '', category: '', quantity: '', minStock: '', price: '', cost: '', location: '', description: '' })
      fetchItems()
    } catch (error) { toast.error('İşlem başarısız: ' + error.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return
    try {
      await deleteDoc(doc(db, 'inventory', id))
      toast.success('Ürün silindi!')
      fetchItems()
    } catch (error) { toast.error('Silinemedi: ' + error.message) }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name || '', sku: item.sku || '', category: item.category || '',
      quantity: String(item.quantity || ''), minStock: String(item.minStock || ''),
      price: String(item.price || ''), cost: String(item.cost || ''),
      location: item.location || '', description: item.description || ''
    })
    setShowModal(true)
  }

  const quickStockUpdate = async (item, delta) => {
    const newQty = Math.max(0, (parseInt(item.quantity) || 0) + delta)
    try {
      await updateDoc(doc(db, 'inventory', item.id), { quantity: newQty, updatedAt: new Date().toISOString() })
      fetchItems()
      if (newQty <= (parseInt(item.minStock) || 0) && newQty > 0) toast.warning(`${item.name} stok uyarısı!`)
      if (newQty === 0) toast.error(`${item.name} stoku tükendi!`)
    } catch (error) { toast.error('Güncellenemedi: ' + error.message) }
  }

  const lowStockItems = items.filter(i => (parseInt(i.quantity) || 0) <= (parseInt(i.minStock) || 0) && (parseInt(i.quantity) || 0) > 0)
  const outOfStockItems = items.filter(i => (parseInt(i.quantity) || 0) === 0)
  const totalValue = items.reduce((sum, i) => sum + ((parseInt(i.quantity) || 0) * (parseFloat(i.cost) || 0)), 0)

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>📦 Envanter</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Stok yönetimi ve düşük stok uyarıları</p>
      </div>

      {/* Low Stock Alerts */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div style={{ marginBottom: '1rem' }}>
          {outOfStockItems.length > 0 && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '1rem', padding: '1rem', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444', marginBottom: '0.5rem' }}>🚫 Stok Tükendi ({outOfStockItems.length})</div>
              {outOfStockItems.map(item => (
                <div key={item.id} style={{ fontSize: '12px', color: '#fca5a5', padding: '0.25rem 0' }}>• {item.name} {item.sku ? `(${item.sku})` : ''}</div>
              ))}
            </div>
          )}
          {lowStockItems.length > 0 && (
            <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '1rem', padding: '1rem' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b', marginBottom: '0.5rem' }}>⚠️ Düşük Stok ({lowStockItems.length})</div>
              {lowStockItems.map(item => (
                <div key={item.id} style={{ fontSize: '12px', color: '#fcd34d', padding: '0.25rem 0' }}>• {item.name} — {item.quantity} adet (min: {item.minStock})</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Toplam Ürün', value: items.length, icon: '📦', color: '#f59e0b' },
          { label: 'Toplam Stok', value: items.reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0), icon: '📊', color: '#3b82f6' },
          { label: 'Düşük Stok', value: lowStockItems.length, icon: '⚠️', color: '#f59e0b' },
          { label: 'Stok Değeri', value: formatCurrency(totalValue), icon: '💰', color: '#10b981' }
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1rem', border: '1px solid #334155', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', marginBottom: '0.25rem' }}>{stat.icon}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '0.25rem' }}>{stat.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <input type="text" placeholder="🔍 Ürün adı, SKU veya açıklama ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '0.625rem 1rem', borderRadius: '0.75rem', fontSize: '14px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }} />
          {canEdit && (
            <button onClick={() => { setEditingItem(null); setFormData({ name: '', sku: '', category: '', quantity: '', minStock: '', price: '', cost: '', location: '', description: '' }); setShowModal(true) }}
              className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
              ➕ Yeni Ürün
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }}>
            <option value="">Tüm Kategoriler</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }}>
            <option value="">Tüm Stok</option>
            <option value="ok">✅ Yeterli</option>
            <option value="low">⚠️ Düşük</option>
            <option value="out">🚫 Tükendi</option>
          </select>
          {(filterCategory || filterStock) && (
            <button onClick={() => { setFilterCategory(''); setFilterStock('') }}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', fontSize: '12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }}>
              ✕ Temizle
            </button>
          )}
        </div>
      </div>

      {/* Items List */}
      <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📋 Ürün Listesi ({filteredItems.length})</h3>
        {loading ? <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>⏳ Yükleniyor...</div>
        : filteredItems.length === 0 ? <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>📭 Ürün bulunamadı</div>
        : (
          <div>
            {filteredItems.map(item => {
              const qty = parseInt(item.quantity) || 0
              const minStock = parseInt(item.minStock) || 0
              const isOut = qty === 0
              const isLow = qty > 0 && qty <= minStock
              const borderColor = isOut ? '#ef4444' : isLow ? '#f59e0b' : '#10b981'
              return (
                <div key={item.id} style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #334155', marginBottom: '0.75rem', borderLeft: `4px solid ${borderColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>{item.name}</span>
                        {isOut && <span style={{ padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '10px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontWeight: '600' }}>Tükendi</span>}
                        {isLow && <span style={{ padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '10px', backgroundColor: 'rgba(245,158,11,0.15)', color: '#fcd34d', fontWeight: '600' }}>Düşük</span>}
                      </div>
                      {item.sku && <div style={{ fontSize: '12px', color: '#64748b' }}>SKU: {item.sku}</div>}
                      {item.category && <div style={{ fontSize: '12px', color: '#94a3b8' }}>📁 {item.category}</div>}
                      {item.location && <div style={{ fontSize: '12px', color: '#64748b' }}>📍 {item.location}</div>}
                      {item.description && <div style={{ fontSize: '11px', color: '#475569', marginTop: '0.25rem' }}>{item.description}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: borderColor }}>{qty}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>min: {minStock}</div>
                      {item.price > 0 && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{formatCurrency(item.price)}</div>}
                      {canEdit && (
                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => quickStockUpdate(item, -1)} style={{ padding: '0.3rem 0.5rem', borderRadius: '0.375rem', fontSize: '12px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: '700' }}>-</button>
                          <button onClick={() => quickStockUpdate(item, 1)} style={{ padding: '0.3rem 0.5rem', borderRadius: '0.375rem', fontSize: '12px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', cursor: 'pointer', fontWeight: '700' }}>+</button>
                          <button onClick={() => handleEdit(item)} style={{ padding: '0.3rem 0.5rem', borderRadius: '0.375rem', fontSize: '11px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: 'none', cursor: 'pointer' }}>✏️</button>
                          <button onClick={() => handleDelete(item.id)} style={{ padding: '0.3rem 0.5rem', borderRadius: '0.375rem', fontSize: '11px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>🗑️</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1.5rem', width: '100%', maxWidth: '480px', maxHeight: '85vh', overflow: 'auto', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>{editingItem ? '✏️ Ürün Düzenle' : '➕ Yeni Ürün'}</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>📦 Ürün Adı *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Ürün adı" className="form-input" required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>🏷️ SKU</label>
                  <input type="text" value={formData.sku} onChange={(e) => setFormData(p => ({ ...p, sku: e.target.value }))} placeholder="Ürün kodu" className="form-input" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>📁 Kategori</label>
                  <input type="text" value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} placeholder="Kategori" className="form-input" list="categoryList" />
                  <datalist id="categoryList">{categories.map(c => <option key={c} value={c} />)}</datalist>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>📊 Stok Miktarı *</label>
                  <input type="number" value={formData.quantity} onChange={(e) => setFormData(p => ({ ...p, quantity: e.target.value }))} placeholder="0" className="form-input" min="0" required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>⚠️ Min. Stok</label>
                  <input type="number" value={formData.minStock} onChange={(e) => setFormData(p => ({ ...p, minStock: e.target.value }))} placeholder="0" className="form-input" min="0" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>💰 Satış Fiyatı</label>
                  <input type="number" value={formData.price} onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))} placeholder="0.00" className="form-input" min="0" step="0.01" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>💵 Maliyet</label>
                  <input type="number" value={formData.cost} onChange={(e) => setFormData(p => ({ ...p, cost: e.target.value }))} placeholder="0.00" className="form-input" min="0" step="0.01" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>📍 Konum</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="Depo / Raf bilgisi" className="form-input" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>📝 Açıklama</label>
                  <textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Ürün açıklaması..." className="form-input" rows={2} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => { setShowModal(false); setEditingItem(null) }} className="btn btn-secondary" style={{ flex: 1 }}>İptal</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingItem ? 'Güncelle' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
