'use client'

import { useState } from 'react'

const CURRENCIES = [
  { code: 'USD', name: 'ABD Doları', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'İngiliz Sterlini', symbol: '£', flag: '🇬🇧' },
  { code: 'TRY', name: 'Türk Lirası', symbol: '₺', flag: '🇹🇷' }
]

const PRESET_RATES = {
  USD: 38.50,
  EUR: 42.00,
  GBP: 49.00,
  TRY: 1
}

export default function DovizPage() {
  const [amount, setAmount] = useState('')
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('TRY')
  const [customRate, setCustomRate] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  const fromVal = parseFloat(amount) || 0
  const rate = useCustom && customRate ? parseFloat(customRate) || 0 : PRESET_RATES[fromCurrency] || 0
  const result = fromVal * rate

  const formatCurrency = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)

  const quickAmounts = [100, 500, 1000, 5000, 10000, 50000]

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>💱 Döviz Çevirici</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Güncel kur ile fiyat çevirme</p>
      </div>

      {/* Çevirici */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Miktar */}
          <div className="form-group">
            <label className="form-label">💰 Miktar</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="form-input" style={{ fontSize: '20px', fontWeight: '700', textAlign: 'center' }} />
          </div>

          {/* Hızlı Miktarlar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
            {quickAmounts.map(qa => (
              <button key={qa} onClick={() => setAmount(String(qa))} style={{
                padding: '0.375rem 0.75rem', borderRadius: '9999px', fontSize: '12px', fontWeight: '600',
                border: '1px solid #334155', backgroundColor: fromVal === qa ? 'rgba(16,185,129,0.2)' : '#0f172a',
                color: fromVal === qa ? '#10b981' : '#94a3b8', cursor: 'pointer'
              }}>
                {qa.toLocaleString('tr-TR')}
              </button>
            ))}
          </div>

          {/* Para Birimi Seçimi */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center' }}>
            <div>
              <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>Gönderen</label>
              <select value={fromCurrency} onChange={(e) => { setFromCurrency(e.target.value); setUseCustom(false) }} className="form-input" style={{ textAlign: 'center' }}>
                {CURRENCIES.filter(c => c.code !== toCurrency).map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '24px', color: '#10b981', marginTop: '1rem' }}>→</div>
            <div>
              <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>Alıcı</label>
              <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)} className="form-input" style={{ textAlign: 'center' }}>
                {CURRENCIES.filter(c => c.code !== fromCurrency).map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Kur */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '13px', color: '#94a3b8' }}>
              <input type="checkbox" checked={useCustom} onChange={() => setUseCustom(!useCustom)} style={{ accentColor: '#10b981' }} />
              Özel kur gir
            </label>
            {useCustom ? (
              <input type="number" value={customRate} onChange={(e) => setCustomRate(e.target.value)} placeholder="Örn: 38.50" className="form-input" style={{ marginTop: '0.5rem' }} />
            ) : (
              <div style={{ marginTop: '0.5rem', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #334155', textAlign: 'center' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Güncel Kur: </span>
                <span style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>1 {fromCurrency} = {rate} TRY</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sonuç */}
      {fromVal > 0 && (
        <div className="card" style={{ marginTop: '1rem', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))', border: '1px solid rgba(16,185,129,0.3)' }}>
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '0.5rem' }}>Çevrilmiş Tutar</div>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#10b981' }}>{formatCurrency(result)}</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '0.5rem' }}>
              {fromVal.toLocaleString('tr-TR')} {fromCurrency} = {result.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY
            </div>
          </div>
        </div>
      )}

      {/* Referans Kurlar */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>📊 Referans Kurlar (TRY)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
          {CURRENCIES.filter(c => c.code !== 'TRY').map(c => (
            <div key={c.code} style={{ padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: '#0f172a', border: '1px solid #334155', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', marginBottom: '0.25rem' }}>{c.flag}</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{c.code}</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>{PRESET_RATES[c.code]} ₺</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{c.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
