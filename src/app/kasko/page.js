'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

const KASKO_RATES = [
  { category: 'Beyaz Eşya', rate: 13, icon: '🍳' },
  { category: 'Küçük Ev Aletleri', rate: 19, icon: '🔌' },
  { category: 'Elektronik / TV', rate: 14, icon: '📺' },
  { category: 'Cep Telefonu / Tablet', rate: 25, icon: '📱' },
  { category: 'Bilgisayar', rate: 23, icon: '💻' },
  { category: 'Scooter / Bisiklet', rate: 27, icon: '🛵' }
]

const KASKO_TYPES = [
  {
    name: 'Kapsamlı Onarım Paketi',
    subtitle: 'Kazaen Kırılma',
    icon: '🛡️',
    color: '#3b82f6',
    features: ['Kullanıcı hatası kaynaklı hasarlar', 'Sıvı teması kaynaklı hasarlar', 'Yüksek voltaj kaynaklı hasarlar', 'Hatalı aksesuar kaynaklı hasarlar', 'Kapalı alandan hırsızlık hasarları']
  },
  {
    name: 'Ek Garanti Paketi',
    subtitle: 'Uzatılmış Garanti',
    icon: '🔄',
    color: '#10b981',
    features: ['Yetkili serviste veya adreste onarım', 'Ürün bedelinde muadil ürün ile değişim', 'Teminat bedeli üzerinden esneme payı düşülerek nakit ödeme']
  }
]

export default function KaskoPage() {
  const [category, setCategory] = useState('')
  const [type, setType] = useState('kapsamli')
  const [productPrice, setProductPrice] = useState('')

  const rate = KASKO_RATES.find(k => k.category === category)?.rate || 0
  const price = parseFloat(productPrice) || 0
  const kaskoPrice = price * (rate / 100)
  const prime = price * 0.05
  const total = price + kaskoPrice + prime

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>🛡️ KASKO Hesaplama</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Kapsamlı Onarım ve Uzatılmış Garanti fiyat hesaplaması</p>
      </div>

      {/* Paketler */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {KASKO_TYPES.map((t, i) => (
          <div key={i} className="card" style={{ borderTop: `3px solid ${t.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '28px' }}>{t.icon}</span>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>{t.name}</div>
                <div style={{ fontSize: '12px', color: t.color, fontWeight: '600' }}>{t.subtitle}</div>
              </div>
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              {t.features.map((f, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.25rem 0' }}>
                  <span style={{ color: t.color }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Hesaplama */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>🧮 KASKO Fiyat Hesapla</h3>

        <div className="form-group">
          <label className="form-label">📊 Kategori</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-input">
            <option value="">Kategori Seçin</option>
            {KASKO_RATES.map(k => <option key={k.category} value={k.category}>{k.icon} {k.category} (%{k.rate})</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">🛡️ KASKO Türü</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="form-input">
            <option value="kapsamli">Kapsamlı Onarım Paketi</option>
            <option value="uzatilmis">Ek Garanti Paketi (Uzatılmış)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">💰 Ürün Satış Fiyatı (TL)</label>
          <input type="number" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="0" className="form-input" />
        </div>

        {/* Sonuç */}
        {rate > 0 && price > 0 && (
          <div style={{
            padding: '1.25rem', borderRadius: '1rem', marginTop: '1rem',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.1))',
            border: '1px solid rgba(6, 182, 212, 0.3)'
          }}>
            <h4 style={{ fontSize: '14px', color: '#06b6d4', fontWeight: '600', marginBottom: '0.75rem' }}>🧮 Sonuç</h4>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>Ürün Fiyatı</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>{formatCurrency(price)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>KASKO Oranı</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: '#06b6d4' }}>%{rate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>Prim (%5)</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: '#f59e0b' }}>{formatCurrency(prime)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>KASKO Fiyatı</span>
              <span style={{ fontSize: '15px', fontWeight: '600', color: '#06b6d4' }}>{formatCurrency(kaskoPrice)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', marginTop: '0.25rem', borderTop: '2px solid #06b6d4' }}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>💰 Toplam Fiyat</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{formatCurrency(total)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
