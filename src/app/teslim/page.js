'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/Toast'

const DELIVERY_STATUS = {
  delivered: { label: 'Teslim Edildi', color: '#10b981', icon: '✅' },
  pending: { label: 'Beklemede', color: '#f59e0b', icon: '⏳' },
  cancelled: { label: 'İptal', color: '#ef4444', icon: '❌' }
}

export default function TeslimPage() {
  const { user } = useAuth()
  const toast = useToast()
  const canManage = user && (user.role === 'ADMIN' || user.role === 'MANAGER')
  const fileRef = useRef(null)

  const [deliveries, setDeliveries] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [photos, setPhotos] = useState([])
  const [viewingPhotos, setViewingPhotos] = useState(null)

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    product: '',
    amount: '',
    notes: '',
    status: 'delivered'
  })

  useEffect(() => {
    if (!user) return
    fetchCustomers()
    const unsub = onSnapshot(collection(db, 'deliveries'), (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      setDeliveries(docs)
      setLoading(false)
    })
    return () => unsub()
  }, [user])

  const fetchCustomers = async () => {
    try {
      const snap = await getDocs(collection(db, 'customers'))
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) {}
  }

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
    if (!formData.customerName.trim()) { toast.warning('Müşteri adı gerekli!'); return }
    try {
      await addDoc(collection(db, 'deliveries'), {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        photos,
        deliveredBy: user.name || user.email,
        deliveredById: user.uid,
        createdAt: new Date().toISOString()
      })
      setFormData({ customerName: '', customerPhone: '', product: '', amount: '', notes: '', status: 'delivered' })
      setPhotos([])
      setShowForm(false)
      toast.success('Teslim kaydı oluşturuldu!')
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'deliveries', id), {
        status: newStatus,
        statusChangedBy: user.name || user.email,
        statusChangedAt: new Date().toISOString()
      })
      toast.success('Durum güncellendi!')
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  const handleCustomerSelect = (e) => {
    const custId = e.target.value
    if (!custId) { setFormData(p => ({ ...p, customerName: '', customerPhone: '' })); return }
    const cust = customers.find(c => c.id === custId)
    if (cust) setFormData(p => ({ ...p, customerName: cust.name || '', customerPhone: cust.phone || '' }))
  }

  const filtered = deliveries.filter(d => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (d.customerName || '').toLowerCase().includes(q) || (d.product || '').toLowerCase().includes(q) || (d.customerPhone || '').includes(q)
    }
    return true
  })

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div>🔑 Giriş yapın</div></div>
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>📦 Müşteri Teslim</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Ürün teslim kayıtları ve belge fotoğrafı</p>
      </div>

      {/* Yeni Kayıt Butonu */}
      <button onClick={() => setShowForm(!showForm)} style={{
        width: '100%', marginBottom: '1rem', padding: '0.875rem',
        background: showForm ? '#334155' : 'linear-gradient(135deg, #ec4899, #be185d)',
        color: showForm ? '#94a3b8' : 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer'
      }}>
        {showForm ? '✕ Kapat' : '➕ Yeni Teslim Kaydı'}
      </button>

      {/* Yeni Teslim Formu */}
      {showForm && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📦 Yeni Teslim Kaydı</h3>
          <form onSubmit={handleSubmit}>
            {/* Müşteri Seçimi veya Elle Girme */}
            <div className="form-group">
              <label className="form-label">👤 Müşteri</label>
              <select onChange={handleCustomerSelect} value="" className="form-input">
                <option value="">Müşteri seçin veya aşağıya yazın</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">👤 Müşteri Adı (elle)</label>
              <input type="text" value={formData.customerName} onChange={(e) => setFormData(p => ({ ...p, customerName: e.target.value }))}
                placeholder="Müşteri adını yazın" required className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">📞 Telefon</label>
              <input type="tel" value={formData.customerPhone} onChange={(e) => setFormData(p => ({ ...p, customerPhone: e.target.value }))}
                placeholder="Telefon numarası" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">📦 Ürün</label>
              <input type="text" value={formData.product} onChange={(e) => setFormData(p => ({ ...p, product: e.target.value }))}
                placeholder="Ürün adı/detayı" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">💰 Tutar (TL)</label>
              <input type="number" value={formData.amount} onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                placeholder="0" step="0.01" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">📝 Not</label>
              <textarea value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                placeholder="Ek notlar..." className="form-input" rows={2} />
            </div>

            {/* Fotoğraf Yükleme */}
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
              <div style={{ fontSize: '11px', color: '#64748b' }}>📷 ile kamera açılır veya galeriden seçilir. Teslim fişi, imza, ürün fotoğrafı.</div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>📦 Kaydet</button>
          </form>
        </div>
      )}

      {/* Filtreler */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input type="text" placeholder="🔍 Müşteri veya ürün ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '13px', backgroundColor: '#334155', border: '1px solid #475569', color: '#f8fafc' }} />
          {[
            { key: 'all', label: 'Tümü' },
            { key: 'delivered', label: '✅ Teslim' },
            { key: 'pending', label: '⏳ Bekleyen' },
            { key: 'cancelled', label: '❌ İptal' }
          ].map(s => (
            <button key={s.key} onClick={() => setFilterStatus(s.key)} style={{
              padding: '0.5rem 0.875rem', borderRadius: '9999px', fontSize: '12px', fontWeight: '600',
              border: filterStatus === s.key ? '2px solid #ec4899' : '1px solid #475569',
              backgroundColor: filterStatus === s.key ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
              color: filterStatus === s.key ? '#ec4899' : '#94a3b8',
              cursor: 'pointer'
            }}>{s.label}</button>
          ))}
        </div>
      </div>

      {/* Teslim Listesi */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '48px', marginBottom: '0.75rem' }}>📭</div>
            <p style={{ color: '#94a3b8' }}>Kayıt bulunamadı</p>
          </div>
        ) : filtered.map(d => {
          const s = DELIVERY_STATUS[d.status] || DELIVERY_STATUS.pending
          return (
            <div key={d.id} className="card" style={{ borderLeft: `4px solid ${s.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>👤 {d.customerName}</div>
                  {d.customerPhone && <div style={{ fontSize: '12px', color: '#94a3b8' }}>📞 {d.customerPhone}</div>}
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.25rem' }}>📦 {d.product || '-'} • 💰 {formatCurrency(d.amount || 0)}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '0.25rem' }}>by {d.deliveredBy} • {d.createdAt ? new Date(d.createdAt).toLocaleDateString('tr-TR') : ''}</div>
                  {d.notes && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.25rem', fontStyle: 'italic' }}>💬 {d.notes}</div>}
                </div>
                <span style={{ padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '11px', fontWeight: '600', backgroundColor: `${s.color}20`, color: s.color }}>
                  {s.icon} {s.label}
                </span>
              </div>

              {/* Fotoğraflar */}
              {d.photos && d.photos.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  {d.photos.map((p, i) => (
                    <img key={i} src={p} alt="" onClick={() => setViewingPhotos({ photos: d.photos, index: i })}
                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid #334155', cursor: 'pointer' }} />
                  ))}
                  <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center' }}>📷 {d.photos.length} belge</div>
                </div>
              )}

              {/* Durum Değiştirme */}
              {canManage && (
                <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.75rem' }}>
                  {Object.entries(DELIVERY_STATUS).map(([key, val]) => (
                    <button key={key} onClick={() => handleStatusChange(d.id, key)} disabled={d.status === key} style={{
                      padding: '0.375rem 0.75rem', borderRadius: '0.5rem', fontSize: '11px', fontWeight: '600',
                      backgroundColor: d.status === key ? `${val.color}30` : 'transparent',
                      color: val.color, border: `1px solid ${d.status === key ? val.color : '#475569'}`,
                      cursor: d.status === key ? 'default' : 'pointer', opacity: d.status === key ? 0.6 : 1
                    }}>{val.icon} {val.label}</button>
                  ))}
                </div>
              )}
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
                style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '0.375rem', border: i === viewingPhotos.index ? '2px solid #ec4899' : '2px solid #475569', cursor: 'pointer' }} />
            ))}
          </div>
          <div style={{ color: '#94a3b8', marginTop: '0.5rem', fontSize: '13px' }}>{viewingPhotos.index + 1} / {viewingPhotos.photos.length}</div>
        </div>
      )}
    </div>
  )
}
