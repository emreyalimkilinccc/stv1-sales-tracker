'use client'

import { useState, useEffect } from 'react'

export default function SalesForm({ onSubmit, initialData = null }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    hour: String(new Date().getHours()),
    amount: '',
    itemCount: '',
    customerPhone: '',
    category: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setFormData({
        date: initialData.date || new Date().toISOString().split('T')[0],
        hour: String(initialData.hour || new Date().getHours()),
        amount: initialData.amount || '',
        itemCount: initialData.itemCount || '',
        customerPhone: initialData.customerPhone || '',
        category: initialData.category || ''
      })
    }
  }, [initialData])

  const categories = [
    { value: 'Giriş kat', icon: '🚪', color: '#3b82f6' },
    { value: 'Züccaciye', icon: '🍳', color: '#8b5cf6' },
    { value: 'Kasa', icon: '🗄️', color: '#10b981' },
    { value: 'Mobilya', icon: '🛋️', color: '#f59e0b' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try { await onSubmit(formData) } catch (err) { setError('Hata: ' + err.message) } finally { setLoading(false) }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#fca5a5', padding: '0.875rem', borderRadius: '0.75rem',
          fontSize: '13px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <span>⚠️</span> {error}
        </div>
      )}

      <div className="form-group">
        <label className="form-label">📅 Tarih</label>
        <input type="date" name="date" value={formData.date} onChange={handleChange} required className="form-input" />
      </div>

      <div className="form-group">
        <label className="form-label">⏰ Saat</label>
        <select name="hour" value={formData.hour} onChange={handleChange} required className="form-input">
          {Array.from({ length: 24 }, (_, i) => <option key={i} value={String(i)}>{String(i).padStart(2, '0')}:00</option>)}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">💰 Satış Tutarı (TL)</label>
        <input type="number" name="amount" value={formData.amount} onChange={handleChange} required min="0" step="0.01" placeholder="0.00 TL" className="form-input" />
      </div>

      <div className="form-group">
        <label className="form-label">📦 Ürün Sayısı</label>
        <input type="number" name="itemCount" value={formData.itemCount} onChange={handleChange} min="0" placeholder="0" className="form-input" />
      </div>

      <div className="form-group">
        <label className="form-label">👤 Müşteri Numarası</label>
        <input type="text" name="customerPhone" value={formData.customerPhone} onChange={handleChange} placeholder="Müşteri numarası" className="form-input" />
      </div>

      <div className="form-group">
        <label className="form-label">🏷️ Kategori</label>
        <div className="grid grid-cols-2 gap-3">
          {categories.map(cat => (
            <button key={cat.value} type="button" onClick={() => setFormData(p => ({ ...p, category: cat.value }))}
              style={{
                padding: '0.875rem', borderRadius: '0.75rem', fontSize: '13px', fontWeight: '500',
                border: `2px solid ${formData.category === cat.value ? cat.color : '#334155'}`,
                backgroundColor: formData.category === cat.value ? `${cat.color}20` : '#1e293b',
                color: formData.category === cat.value ? cat.color : '#94a3b8',
                cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease'
              }}>
              {cat.icon} {cat.value}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>
        {loading ? '⏳ Kaydediliyor...' : initialData ? '✅ Güncelle' : '💾 Kaydet'}
      </button>
    </form>
  )
}
