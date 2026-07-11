'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/Toast'

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
  const { user } = useAuth()
  const toast = useToast()
  const canManage = user && (user.role === 'ADMIN' || user.role === 'MANAGER')

  const [sales, setSales] = useState([])
  const [kaskoRecords, setKaskoRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState(null)
  const [showKaskoForm, setShowKaskoForm] = useState(false)
  const [kaskoForm, setKaskoForm] = useState({ category: '', rate: 0, type: 'kapsamli', productPrice: '', kaskoPrice: '' })

  useEffect(() => {
    if (!user) return

    // Satışları çek
    let salesQuery
    if (user.role === 'STAFF') {
      salesQuery = query(collection(db, 'sales'), where('userId', '==', user.uid))
    } else if (user.role === 'MANAGER') {
      salesQuery = query(collection(db, 'sales'), where('storeId', '==', user.storeId))
    } else {
      salesQuery = collection(db, 'sales')
    }

    const unsubSales = onSnapshot(salesQuery, (snap) => {
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })

    // KASKO kayıtlarını çek
    const unsubKasko = onSnapshot(collection(db, 'kasko'), (snap) => {
      setKaskoRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })

    return () => { unsubSales(); unsubKasko() }
  }, [user])

  // Kategori bazlı KASKO istatistikleri
  const categoryStats = KASKO_RATES.map(kr => {
    const categorySales = sales.filter(s => {
      const cat = s.category || ''
      if (kr.category === 'Beyaz Eşya') return cat.includes('Züccaciye') || cat.includes('Mobilya')
      if (kr.category === 'Küçük Ev Aletleri') return cat.includes('Kasa')
      if (kr.category === 'Elektronik / TV') return cat.includes('Giriş kat')
      if (kr.category === 'Cep Telefonu / Tablet') return cat.includes('Giriş kat')
      if (kr.category === 'Bilgisayar') return cat.includes('Giriş kat')
      if (kr.category === 'Scooter / Bisiklet') return cat.includes('Mobilya')
      return false
    })
    const totalSalesAmount = categorySales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
    const kaskoCount = kaskoRecords.filter(k => k.category === kr.category).length
    const kaskoAmount = kaskoRecords.filter(k => k.category === kr.category).reduce((sum, k) => sum + (k.kaskoPrice || 0), 0)

    return {
      ...kr,
      totalSales: categorySales.length,
      totalSalesAmount,
      kaskoCount,
      kaskoAmount,
      kaskoPercentage: categorySales.length > 0 ? (kaskoCount / categorySales.length * 100) : 0
    }
  })

  const totalSales = sales.length
  const totalKasko = kaskoRecords.length
  const overallPercentage = totalSales > 0 ? (totalKasko / totalSales * 100) : 0
  const totalKaskoRevenue = kaskoRecords.reduce((sum, k) => sum + (k.kaskoPrice || 0), 0)

  const handleKaskoSubmit = async (data) => {
    try {
      await addDoc(collection(db, 'kasko'), {
        category: data.category,
        rate: data.rate,
        type: data.type,
        productPrice: data.productPrice,
        kaskoPrice: data.kaskoPrice,
        prime: data.prime || 0,
        totalPrice: data.totalPrice || 0,
        addedBy: user.name || user.email,
        addedById: user.uid,
        createdAt: new Date().toISOString()
      })
      setKaskoForm({ category: '', rate: 0, type: 'kapsamli', productPrice: '', kaskoPrice: '' })
      setShowKaskoForm(false)
      toast.success('KASKO kaydı eklendi!')
    } catch (error) { toast.error('Hata: ' + error.message) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>🛡️ KASKO & Garanti</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Kapsamlı Onarım ve Uzatılmış Garanti takibi</p>
      </div>

      {/* KASKO Paketleri */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {KASKO_TYPES.map((type, i) => (
          <div key={i} className="card" style={{ borderTop: `3px solid ${type.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '28px' }}>{type.icon}</span>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>{type.name}</div>
                <div style={{ fontSize: '12px', color: type.color, fontWeight: '600' }}>{type.subtitle}</div>
              </div>
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              {type.features.map((f, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.25rem 0' }}>
                  <span style={{ color: type.color, fontSize: '12px', marginTop: '2px' }}>✓</span> {f}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Kategori Bazlı KASKO Oranları */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>📊 Kategori Bazlı KASKO Oranları</h3>
          <div style={{ fontSize: '13px', color: '#06b6d4', fontWeight: '600' }}>
            Genel: %{overallPercentage.toFixed(1)}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginBottom: '1rem' }}>
          <div style={{ flex: '1 1 0', padding: '0.75rem', backgroundColor: '#0f172a', borderRadius: '0.5rem', textAlign: 'center', minWidth: '100px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Barem Grubu</div>
          </div>
          <div style={{ flex: '1 1 0', padding: '0.75rem', backgroundColor: '#3b82f6', borderRadius: '0.5rem', textAlign: 'center', minWidth: '100px' }}>
            <div style={{ fontSize: '11px', color: '#fff', fontWeight: '600' }}>KZH+UG2 Fiyatı</div>
          </div>
        </div>

        <div className="space-y-1">
          {categoryStats.map((cat, i) => (
            <div key={i} style={{
              display: 'flex', flexWrap: 'wrap', gap: '2px',
              backgroundColor: i % 2 === 0 ? '#0f172a' : 'transparent', borderRadius: '0.375rem'
            }}>
              <div style={{ flex: '1 1 0', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '100px' }}>
                <span style={{ fontSize: '16px' }}>{cat.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{cat.category}</span>
              </div>
              <div style={{ flex: '1 1 0', padding: '0.75rem', textAlign: 'right', minWidth: '100px' }}>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#06b6d4' }}>%{cat.rate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KASKO İstatistikleri */}
      <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Toplam Satış', value: totalSales, icon: '📦', color: '#3b82f6' },
          { label: 'KASKO Satılan', value: totalKasko, icon: '🛡️', color: '#10b981' },
          { label: 'KASKO Geliri', value: formatCurrency(totalKaskoRevenue), icon: '💰', color: '#06b6d4' }
        ].map((stat, i) => (
          <div key={i} style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1rem', border: '1px solid #334155', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', marginBottom: '0.25rem' }}>{stat.icon}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{stat.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Genel İlerleme Çubuğu */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>📈 Genel KASKO Oranı</h3>
        <div style={{ height: '24px', backgroundColor: '#0f172a', borderRadius: '12px', overflow: 'hidden', marginBottom: '0.5rem' }}>
          <div style={{
            height: '100%', width: `${Math.min(overallPercentage, 100)}%`,
            background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
            borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'width 0.5s ease'
          }}>
            {overallPercentage > 5 && <span style={{ fontSize: '11px', fontWeight: '700', color: '#fff' }}>%{overallPercentage.toFixed(1)}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
          <span>{totalKasko} KASKO / {totalSales} Satış</span>
          <span style={{ fontWeight: '600', color: '#06b6d4' }}>%{overallPercentage.toFixed(1)}</span>
        </div>
      </div>

      {/* Kategori Bazlı Detaylar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📋 Kategori Detayları</h3>
        <div className="space-y-2">
          {categoryStats.map((cat, i) => (
            <div key={i} style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '0.875rem', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{cat.category}</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#06b6d4' }}>%{cat.rate}</span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                <div style={{
                  height: '100%', width: `${Math.min(cat.kaskoPercentage, 100)}%`,
                  background: `linear-gradient(90deg, ${cat.kaskoPercentage > 0 ? '#10b981' : '#334155'}, ${cat.kaskoPercentage > 0 ? '#06b6d4' : '#475569'})`,
                  borderRadius: '4px', transition: 'width 0.5s ease'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                <span>KASKO: {cat.kaskoCount} / {cat.totalSales} satış</span>
                <span style={{ fontWeight: '600' }}>%{cat.kaskoPercentage.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KASKO Hesapla */}
      {canManage && (
        <div className="card">
          <button onClick={() => setShowKaskoForm(!showKaskoForm)} style={{
            width: '100%', padding: '0.875rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: '600',
            background: showKaskoForm ? '#334155' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: showKaskoForm ? '#94a3b8' : '#fff', border: 'none', cursor: 'pointer'
          }}>
            {showKaskoForm ? '✕ Kapat' : '🧮 KASKO Hesapla'}
          </button>

          {showKaskoForm && (
            <div style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label">📊 Kategori</label>
                <select value={kaskoForm.category} onChange={(e) => {
                  const cat = KASKO_RATES.find(k => k.category === e.target.value)
                  const productPrice = parseFloat(kaskoForm.productPrice) || 0
                  const kaskoPrice = cat ? productPrice * (cat.rate / 100) : 0
                  setKaskoForm(p => ({ ...p, category: e.target.value, rate: cat ? cat.rate : 0, kaskoPrice: kaskoPrice > 0 ? kaskoPrice.toFixed(2) : '' }))
                }} required className="form-input">
                  <option value="">Kategori Seçin</option>
                  {KASKO_RATES.map(k => <option key={k.category} value={k.category}>{k.icon} {k.category} (%{k.rate})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">🛡️ KASKO Türü</label>
                <select value={kaskoForm.type} onChange={(e) => setKaskoForm(p => ({ ...p, type: e.target.value }))} className="form-input">
                  <option value="kapsamli">Kapsamlı Onarım Paketi</option>
                  <option value="uzatilmis">Ek Garanti Paketi (Uzatılmış)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">💰 Ürün Satış Fiyatı (TL)</label>
                <input type="number" value={kaskoForm.productPrice} onChange={(e) => {
                  const productPrice = parseFloat(e.target.value) || 0
                  const kaskoPrice = productPrice * (kaskoForm.rate / 100)
                  setKaskoForm(p => ({ ...p, productPrice: e.target.value, kaskoPrice: kaskoPrice > 0 ? kaskoPrice.toFixed(2) : '' }))
                }} placeholder="0" required className="form-input" />
              </div>
              {kaskoForm.rate > 0 && (
                <div style={{
                  padding: '1rem', borderRadius: '0.75rem', marginBottom: '1rem',
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.1))',
                  border: '1px solid rgba(6, 182, 212, 0.3)'
                }}>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '0.75rem' }}>🧮 KASKO Fiyat Hesaplaması</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ fontSize: '14px', color: '#94a3b8' }}>Ürün Fiyatı</span>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>{formatCurrency(parseFloat(kaskoForm.productPrice) || 0)}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ fontSize: '14px', color: '#94a3b8' }}>KASKO Oranı</span>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#06b6d4' }}>%{kaskoForm.rate}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ fontSize: '14px', color: '#94a3b8' }}>Prim (%5)</span>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#f59e0b' }}>{formatCurrency((parseFloat(kaskoForm.productPrice) || 0) * 0.05)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ fontSize: '14px', color: '#94a3b8' }}>KASKO Fiyatı</span>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#06b6d4' }}>{formatCurrency(parseFloat(kaskoForm.kaskoPrice) || 0)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', marginTop: '0.25rem', borderTop: '2px solid #06b6d4' }}>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>💰 Toplam Fiyat</span>
                    <span style={{ fontSize: '20px', fontWeight: '800', color: '#10b981' }}>{formatCurrency((parseFloat(kaskoForm.productPrice) || 0) + (parseFloat(kaskoForm.kaskoPrice) || 0))}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
