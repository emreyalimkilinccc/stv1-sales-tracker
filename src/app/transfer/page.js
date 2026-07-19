'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/components/Toast'

const CATEGORIES = [
  { id: 'magaza', label: '🏪 Mağaza Deposu', color: '#3b82f6' },
  { id: 'dis', label: '📦 Dış Depo', color: '#f59e0b' }
]

export default function TransferPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState('magaza')
  const [storeName, setStoreName] = useState('')
  const [barcode, setBarcode] = useState('')
  const [plateNumber, setPlateNumber] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDoc, setShowDoc] = useState(null)

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, 'transfers'))
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        const todayRecords = data.filter(r => {
          const rDate = new Date(r.createdAt)
          const rStr = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`
          return rStr === todayStr
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setRecords(todayRecords)
      } catch (e) {}
      setLoading(false)
    }
    fetchData()
  }, [todayStr])

  if (!user) return null

  const handleSave = async () => {
    if (!storeName.trim()) { toast('Mağaza adı girin', 'error'); return }
    setSaving(true)
    try {
      await addDoc(collection(db, 'transfers'), {
        category: selectedCat,
        categoryName: CATEGORIES.find(c => c.id === selectedCat)?.label || '',
        storeName: storeName.trim(),
        barcode: barcode.trim(),
        plateNumber: plateNumber.trim(),
        note: note.trim(),
        userId: user.uid,
        userName: user.name || user.email,
        createdAt: new Date().toISOString(),
        date: todayStr
      })
      const snap = await getDocs(collection(db, 'transfers'))
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const todayRecords = data.filter(r => {
        const rDate = new Date(r.createdAt)
        const rStr = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`
        return rStr === todayStr
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setRecords(todayRecords)
      setStoreName('')
      setBarcode('')
      setPlateNumber('')
      setNote('')
      toast('Transfer kaydedildi!', 'success')
    } catch (e) {
      toast('Kaydedilemedi', 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'transfers', id))
      setRecords(prev => prev.filter(r => r.id !== id))
      toast('Kayıt silindi', 'info')
    } catch (e) {}
  }

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>🚛 Transfer</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Mağaza Deposu ve Dış Depo transfer kayıtları</p>
      </div>

      {/* Kategori Seçimi */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setSelectedCat(c.id)} style={{
            flex: 1, padding: '0.875rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: '600',
            border: `2px solid ${selectedCat === c.id ? c.color : '#334155'}`,
            backgroundColor: selectedCat === c.id ? `${c.color}15` : '#0f172a',
            color: selectedCat === c.id ? c.color : '#94a3b8', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="card" style={{ marginTop: '0.75rem' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>
          ➕ Yeni Transfer — {CATEGORIES.find(c => c.id === selectedCat)?.label}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">🏪 Mağaza Adı</label>
            <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Mağaza adı yazın..." className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label">📊 Barkod</label>
            <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Barkod numarası" className="form-input" />
          </div>

          <div className="form-group">
            <label className="form-label">🚗 Araç Plakası</label>
            <input type="text" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder="34 ABC 123" className="form-input" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">📝 Not (isteğe bağlı)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ek not..." className="form-input" />
        </div>

        {/* Bilgi satırı */}
        <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem 0', fontSize: '12px', color: '#64748b' }}>
          <span>📅 {today.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span>⏰ {today.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
          <span>👤 {user.name || user.email}</span>
        </div>

        <button onClick={handleSave} disabled={saving || !storeName.trim()} style={{
          width: '100%', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: '600',
          border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
          background: storeName.trim() ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : '#334155',
          color: '#fff', opacity: storeName.trim() ? 1 : 0.5
        }}>
          {saving ? '⏳ Kaydediliyor...' : '💾 Kaydet'}
        </button>
      </div>

      {/* Kayıt Sayısı */}
      <div style={{ marginTop: '0.75rem', fontSize: '13px', color: '#94a3b8' }}>
        📋 Bugünkü transferler: <strong>{records.length}</strong>
      </div>

      {/* Kayıt Listesi */}
      <div className="card" style={{ marginTop: '0.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Yükleniyor...</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Bugün transfer kaydı yok</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {records.map(r => {
              const cat = CATEGORIES.find(c => c.id === r.category)
              const time = new Date(r.createdAt)
              return (
                <div key={r.id} style={{
                  padding: '0.75rem 1rem', borderRadius: '0.75rem',
                  backgroundColor: '#0f172a', border: `1px solid ${cat?.color || '#334155'}30`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '18px' }}>{cat?.icon || '📦'}</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{r.storeName}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {r.barcode && <span>📊 {r.barcode}</span>}
                          {r.barcode && r.plateNumber && <span> • </span>}
                          {r.plateNumber && <span>🚗 {r.plateNumber}</span>}
                          {r.note && <span> • 📝 {r.note}</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          👤 {r.userName} • {time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => setShowDoc(r)} style={{
                        width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                        backgroundColor: 'rgba(139,92,246,0.15)', color: '#a78bfa', cursor: 'pointer', fontSize: '12px'
                      }}>🖨️</button>
                      <button onClick={() => handleDelete(r.id)} style={{
                        width: '28px', height: '28px', borderRadius: '50%', border: 'none',
                        backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', fontSize: '12px'
                      }}>✕</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Yazdırılabilir Döküman */}
      {showDoc && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={() => setShowDoc(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            width: '100%', maxWidth: '480px', backgroundColor: '#1e293b', borderRadius: '1rem',
            overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>🖨️ Transfer Dökümanı</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => {
                  const el = document.getElementById('transfer-doc')
                  if (!el) return
                  const win = window.open('', '_blank')
                  win.document.write(`<!DOCTYPE html><html><head><title>Transfer</title><style>@page{margin:2cm}body{font-family:Arial,sans-serif;color:#1a1a1a;padding:2rem}h1{text-align:center;font-size:18px;border-bottom:2px solid #333;padding-bottom:10px}.info{text-align:center;margin:15px 0;font-size:13px}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #333;padding:8px 12px;text-align:left;font-size:13px}th{background:#f0f0f0}.footer{margin-top:30px;text-align:center;font-size:12px}</style></head><body>`)
                  win.document.write(el.innerHTML)
                  win.document.write('</body></html>')
                  win.document.close()
                  setTimeout(() => { win.print(); win.close() }, 500)
                }} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', fontSize: '12px', border: '1px solid #475569', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>🖨️ Yazdır</button>
                <button onClick={() => setShowDoc(null)} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', fontSize: '12px', border: 'none', backgroundColor: '#334155', color: '#f8fafc', cursor: 'pointer' }}>✕</button>
              </div>
            </div>

            <div id="transfer-doc" style={{ padding: '1.5rem', backgroundColor: '#fff', color: '#1a1a1a' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #333', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '18px', fontWeight: '800' }}>STV1 SATIŞ TAKİP SİSTEMİ</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem' }}>Transfer Fişi</div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '16px', fontWeight: '700' }}>{showDoc.categoryName}</div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '0.25rem' }}>{showDoc.date} — {showDoc.storeName}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left', width: '40px' }}>Sıra</th>
                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left' }}>Bilgi</th>
                    <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left' }}>Değer</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td style={{ border: '1px solid #d1d5db', padding: '8px' }}>1</td><td style={{ border: '1px solid #d1d5db', padding: '8px', fontWeight: '600' }}>Mağaza Adı</td><td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{showDoc.storeName}</td></tr>
                  <tr><td style={{ border: '1px solid #d1d5db', padding: '8px' }}>2</td><td style={{ border: '1px solid #d1d5db', padding: '8px', fontWeight: '600' }}>Barkod</td><td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{showDoc.barcode || '-'}</td></tr>
                  <tr><td style={{ border: '1px solid #d1d5db', padding: '8px' }}>3</td><td style={{ border: '1px solid #d1d5db', padding: '8px', fontWeight: '600' }}>Araç Plakası</td><td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{showDoc.plateNumber || '-'}</td></tr>
                  <tr><td style={{ border: '1px solid #d1d5db', padding: '8px' }}>4</td><td style={{ border: '1px solid #d1d5db', padding: '8px', fontWeight: '600' }}>Tarih / Saat</td><td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{showDoc.date} — {new Date(showDoc.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</td></tr>
                  <tr><td style={{ border: '1px solid #d1d5db', padding: '8px' }}>5</td><td style={{ border: '1px solid #d1d5db', padding: '8px', fontWeight: '600' }}>İşlem Yapan</td><td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{showDoc.userName}</td></tr>
                  {showDoc.note && <tr><td style={{ border: '1px solid #d1d5db', padding: '8px' }}>6</td><td style={{ border: '1px solid #d1d5db', padding: '8px', fontWeight: '600' }}>Not</td><td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{showDoc.note}</td></tr>}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '150px', borderBottom: '1px solid #1a1a1a', marginBottom: '0.375rem', height: '30px' }} />
                  <div style={{ fontSize: '12px', fontWeight: '600' }}>İşlem Yapan</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>{showDoc.userName}</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '0.75rem', borderTop: '1px solid #d1d5db', fontSize: '10px', color: '#9ca3af' }}>
                Bu belge STV1 Satış Takip Sistemi tarafından otomatik olarak oluşturulmuştur.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
