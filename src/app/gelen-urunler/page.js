'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, getDocs, addDoc, updateDoc, doc, onSnapshot, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/Toast'

const STATUS = {
  received: { label: 'Alındı', color: '#10b981', icon: '✅' },
  checking: { label: 'Kontrol Ediliyor', color: '#f59e0b', icon: '🔍' },
  shelved: { label: 'Rafa Kaldırıldı', color: '#3b82f6', icon: '📦' },
  rejected: { label: 'Reddedildi', color: '#ef4444', icon: '❌' }
}

const CATEGORIES = ['Giriş kat', 'Züccaciye', 'Kasa', 'Mobilya', 'Diğer']

export default function GelenUrunlerPage() {
  const { user } = useAuth()
  const toast = useToast()
  const canManage = user && (user.role === 'ADMIN' || user.role === 'MANAGER')
  const fileRef = useRef(null)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [photos, setPhotos] = useState([])
  const [viewingPhotos, setViewingPhotos] = useState(null)
  const [showDetail, setShowDetail] = useState(null)
  const [editingItem, setEditingItem] = useState(null)

  const [formData, setFormData] = useState({
    productName: '',
    supplier: '',
    category: 'Giriş kat',
    quantity: '1',
    unitPrice: '',
    notes: ''
  })

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(collection(db, 'incomingProducts'), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      setItems(docs)
      setLoading(false)
    })
    return () => unsub()
  }, [user])

  const compressImage = (file) => new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 800
        let w = img.width, h = img.height
        if (w > MAX) { h = (MAX / w) * h; w = MAX }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.6))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (photos.length + files.length > 5) { toast.warning('En fazla 5 fotoğraf!'); return }
    const compressed = await Promise.all(files.map(f => compressImage(f)))
    setPhotos(prev => [...prev, ...compressed])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.productName.trim()) { toast.warning('Ürün adı gerekli!'); return }
    try {
      await addDoc(collection(db, 'incomingProducts'), {
        ...formData,
        quantity: parseInt(formData.quantity) || 1,
        unitPrice: parseFloat(formData.unitPrice) || 0,
        photos,
        receivedBy: user.name || user.email,
        receivedById: user.uid,
        status: 'received',
        createdAt: new Date().toISOString()
      })
      setFormData({ productName: '', supplier: '', category: 'Giriş kat', quantity: '1', unitPrice: '', notes: '' })
      setPhotos([])
      setShowForm(false)
      toast.success('Gelen ürün kaydedildi!')
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'incomingProducts', id), {
        status: newStatus,
        statusChangedBy: user.name || user.email,
        statusChangedAt: new Date().toISOString()
      })
      toast.success('Durum güncellendi!')
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return
    try {
      await deleteDoc(doc(db, 'incomingProducts', id))
      toast.success('Kayıt silindi!')
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const handleEdit = (item) => {
    setFormData({
      productName: item.productName || '',
      supplier: item.supplier || '',
      category: item.category || 'Giriş kat',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || '',
      notes: item.notes || ''
    })
    setPhotos(item.photos || [])
    setEditingItem(item)
    setShowForm(true)
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!formData.productName.trim()) { toast.warning('Ürün adı gerekli!'); return }
    try {
      await updateDoc(doc(db, 'incomingProducts', editingItem.id), {
        ...formData,
        quantity: parseInt(formData.quantity) || 1,
        unitPrice: parseFloat(formData.unitPrice) || 0,
        photos,
        editedBy: user.name || user.email,
        editedAt: new Date().toISOString()
      })
      setFormData({ productName: '', supplier: '', category: 'Giriş kat', quantity: '1', unitPrice: '', notes: '' })
      setPhotos([])
      setEditingItem(null)
      setShowForm(false)
      toast.success('Ürün güncellendi!')
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const filtered = items.filter(item => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (item.productName || '').toLowerCase().includes(q) || (item.supplier || '').toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q)
    }
    return true
  })

  const totalValue = filtered.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.quantity || 0)), 0)

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div>🔑 Giriş yapın</div></div>
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>📥 Gelen Ürünler</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Gelen ürün kayıtları ve kontrol takibi</p>
      </div>

      {/* Yeni Kayıt Butonu */}
      <button onClick={() => setShowForm(!showForm)} style={{
        width: '100%', marginBottom: '1rem', padding: '0.875rem',
        background: showForm ? '#334155' : 'linear-gradient(135deg, #f97316, #ea580c)',
        color: showForm ? '#94a3b8' : 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer'
      }}>
        {showForm ? '✕ Kapat' : '➕ Yeni Gelen Ürün'}
        </button>

      {/* Form */}
      {showForm && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>{editingItem ? '✏️ Ürün Düzenle' : '📥 Gelen Ürün Kaydı'}</h3>
          <form onSubmit={editingItem ? handleSaveEdit : handleSubmit}>
            <div className="form-group">
              <label className="form-label">📦 Ürün Adı</label>
              <input type="text" value={formData.productName} onChange={(e) => setFormData(p => ({ ...p, productName: e.target.value }))}
                placeholder="Ürün adı" required className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">🏢 Tedarikçi</label>
              <input type="text" value={formData.supplier} onChange={(e) => setFormData(p => ({ ...p, supplier: e.target.value }))}
                placeholder="Tedarikçi adı" className="form-input" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">🏷️ Kategori</label>
                <select value={formData.category} onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))} className="form-input">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">📊 Miktar</label>
                <input type="number" value={formData.quantity} onChange={(e) => setFormData(p => ({ ...p, quantity: e.target.value }))}
                  min="1" className="form-input" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">💰 Birim Fiyat (TL)</label>
              <input type="number" value={formData.unitPrice} onChange={(e) => setFormData(p => ({ ...p, unitPrice: e.target.value }))}
                placeholder="0" step="0.01" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">📝 Not</label>
              <textarea value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                placeholder="Ek notlar..." className="form-input" rows={2} />
            </div>

            {/* Fotoğraf */}
            <div className="form-group">
              <label className="form-label">📷 Belge Fotoğrafı ({photos.length}/5)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={p} alt="" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '0.5rem', border: '2px solid #334155' }} />
                    <button type="button" onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))} style={{
                      position: 'absolute', top: '-5px', right: '-5px', width: '20px', height: '20px',
                      borderRadius: '50%', backgroundColor: '#ef4444', color: '#fff', fontSize: '10px',
                      border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>✕</button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button type="button" onClick={() => fileRef.current?.click()} style={{
                    width: '80px', height: '80px', borderRadius: '0.5rem', border: '2px dashed #475569',
                    backgroundColor: 'transparent', color: '#94a3b8', fontSize: '24px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>📷</button>
                )}
                <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>📷 ile kamera açılır. İrsaliye, fatura, ürün fotoğrafı çekilebilir.</div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>{editingItem ? '💾 Güncelle' : '📥 Kaydet'}</button>
          </form>
        </div>
      )}

      {/* İstatistikler */}
      <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Toplam Ürün', value: items.length, icon: '📦', color: '#f97316' },
          { label: 'Toplam Değer', value: formatCurrency(items.reduce((s, i) => s + ((i.unitPrice || 0) * (i.quantity || 0)), 0)), icon: '💰', color: '#10b981' },
          { label: 'Bekleyen', value: items.filter(i => i.status === 'checking').length, icon: '🔍', color: '#f59e0b' }
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1rem', border: '1px solid #334155', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', marginBottom: '0.25rem' }}>{stat.icon}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{stat.label}</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filtreler */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input type="text" placeholder="🔍 Ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: '150px', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '13px', backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }} />
          {Object.entries({ all: 'Tümü', ...STATUS }).map(([key, val]) => (
            <button key={key} onClick={() => setFilterStatus(key)} style={{
              padding: '0.5rem 0.75rem', borderRadius: '9999px', fontSize: '11px', fontWeight: '600',
              border: filterStatus === key ? '2px solid #f97316' : '1px solid #475569',
              backgroundColor: filterStatus === key ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
              color: filterStatus === key ? '#f97316' : '#94a3b8', cursor: 'pointer'
            }}>{val.icon} {val.label}</button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '48px', marginBottom: '0.75rem' }}>📭</div>
            <p style={{ color: '#94a3b8' }}>Kayıt bulunamadı</p>
          </div>
        ) : filtered.map(item => {
          const s = STATUS[item.status] || STATUS.received
          return (
            <div key={item.id} className="card" style={{ borderLeft: `4px solid ${s.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>📦 {item.productName}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.25rem' }}>
                    {item.supplier && <span>🏢 {item.supplier} • </span>}
                    🏷️ {item.category} • 📊 {item.quantity} adet
                    {item.unitPrice > 0 && <span> • 💰 {formatCurrency(item.unitPrice)}/adet</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '0.25rem' }}>
                    👤 {item.receivedBy} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString('tr-TR') : ''}
                  </div>
                  {item.notes && <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginTop: '0.25rem' }}>💬 {item.notes}</div>}

                  {/* Fotoğraflar */}
                  {item.photos && item.photos.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {item.photos.slice(0, 4).map((p, i) => (
                        <img key={i} src={p} alt="" onClick={() => setViewingPhotos({ photos: item.photos, index: i })}
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '0.375rem', border: '1px solid #334155', cursor: 'pointer' }} />
                      ))}
                      {item.photos.length > 4 && <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>+{item.photos.length - 4}</span>}
                    </div>
                  )}
                </div>
                <span style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '11px', fontWeight: '600', backgroundColor: `${s.color}20`, color: s.color, flexShrink: 0 }}>
                  {s.icon} {s.label}
                </span>
              </div>

              {/* Durum + Sil */}
              <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {Object.entries(STATUS).map(([key, val]) => (
                  <button key={key} onClick={() => handleStatusChange(item.id, key)} disabled={item.status === key} style={{
                    padding: '0.375rem 0.625rem', borderRadius: '0.5rem', fontSize: '11px', fontWeight: '600',
                    backgroundColor: item.status === key ? `${val.color}30` : 'transparent',
                    color: val.color, border: `1px solid ${item.status === key ? val.color : '#475569'}`,
                    cursor: item.status === key ? 'default' : 'pointer', opacity: item.status === key ? 0.6 : 1
                  }}>{val.icon}</button>
                ))}
                {canManage && (
                  <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
                    <button onClick={() => handleEdit(item)} style={{
                      padding: '0.375rem 0.625rem', borderRadius: '0.5rem', fontSize: '11px',
                      backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: 'none', cursor: 'pointer'
                    }}>✏️</button>
                    <button onClick={() => handleDelete(item.id)} style={{
                      padding: '0.375rem 0.625rem', borderRadius: '0.5rem', fontSize: '11px',
                      backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', cursor: 'pointer'
                    }}>🗑️</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Fotoğraf Büyük Görünüm Modalı */}
      {viewingPhotos && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={() => setViewingPhotos(null)}>
          <button onClick={() => setViewingPhotos(null)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', zIndex: 10 }}>✕</button>
          <img src={viewingPhotos.photos[viewingPhotos.index]} alt="" style={{ maxWidth: '90vw', maxHeight: '70vh', objectFit: 'contain', borderRadius: '0.5rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            {viewingPhotos.photos.map((p, i) => (
              <img key={i} src={p} alt="" onClick={(e) => { e.stopPropagation(); setViewingPhotos(prev => ({ ...prev, index: i })) }}
                style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '0.375rem', border: i === viewingPhotos.index ? '2px solid #f97316' : '2px solid #475569', cursor: 'pointer' }} />
            ))}
          </div>
          <div style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '13px' }}>{viewingPhotos.index + 1} / {viewingPhotos.photos.length}</div>
        </div>
      )}
    </div>
  )
}
