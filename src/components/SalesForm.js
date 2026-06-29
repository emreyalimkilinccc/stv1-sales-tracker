'use client'

import { useState, useEffect } from 'react'

export default function SalesForm({ onSubmit, initialData = null }) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    hour: String(new Date().getHours()),
    amount: '',
    itemCount: '',
    bonusItemCount: '',
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
        bonusItemCount: initialData.bonusItemCount || '',
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
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '13px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
        <label className="form-label">🎁 Bonus Ürün Sayısı</label>
        <input type="number" name="bonusItemCount" value={formData.bonusItemCount} onChange={handleChange} min="0" placeholder="0" className="form-input" />
      </div>

      <div className="form-group">
        <label className="form-label">👤 Müşteri Numarası</label>
        <input type="text" name="customerPhone" value={formData.customerPhone} onChange={handleChange} placeholder="Müşteri numarası" className="form-input" />
      </div>

      <div className="form-group">
        <label className="form-label">🏷️ Kategori</label>
        <select name="category" value={formData.category} onChange={handleChange} required className="form-input">
          <option value="">Seçiniz</option>
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.icon} {cat.value}</option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
        {loading ? '⏳ Kaydediliyor...' : initialData ? '✅ Güncelle' : '💾 Kaydet'}
      </button>
    </form>
  )
}
