'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/components/Toast'

const TABS = [
  { id: 'banka', label: '🏦 Banka Tahsilatı', desc: 'Her Salı kasadan bankaya yatırılan tutarlar', color: '#3b82f6', schedule: 'Her Salı' },
  { id: 'marka', label: '🏷️ Marka Primi', desc: "Her ayın 10'unda alınan prim", color: '#f59e0b', schedule: 'Her ayın 10\'u' },
  { id: 'normal', label: '💵 Normal Prim', desc: "Her ayın 25'inde alınan prim", color: '#10b981', schedule: "Her ayın 25'i" }
]

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export default function MuhasebePage() {
  const { user } = useAuth()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('banka')
  const [records, setRecords] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [selectedUser, setSelectedUser] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const [filterMonth, setFilterMonth] = useState(new Date().getMonth())
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())

  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const period = `${filterYear}-${String(filterMonth + 1).padStart(2, '0')}`

  const canEdit = ['ADMIN', 'MANAGER'].includes(user?.role) || user?.category === 'Kasa'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userSnap = await getDocs(collection(db, 'user'))
        setStaff(userSnap.docs.map(d => ({ id: d.id, ...d.data() })))

        const finSnap = await getDocs(collection(db, 'finance'))
        setRecords(finSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) {}
      setLoading(false)
    }
    fetchData()
  }, [])

  if (!user) return null
  if (!['ADMIN', 'MANAGER'].includes(user.role) && user.category !== 'Kasa') {
    return (
      <div className="px-4 py-6 max-w-4xl mx-auto" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>Erişim Engellendi</h2>
        <p style={{ fontSize: '14px', color: '#94a3b8' }}>Bu sayfaya sadece yönetici, müdür ve kasa yetkilileri erişebilir.</p>
      </div>
    )
  }

  const filteredRecords = records.filter(r => {
    if (r.type !== activeTab) return false
    const rDate = new Date(r.date)
    return rDate.getMonth() === filterMonth && rDate.getFullYear() === filterYear
  }).sort((a, b) => new Date(b.date) - new Date(a.date))

  const totalAmount = filteredRecords.reduce((sum, r) => sum + (r.amount || 0), 0)

  const formatCurrency = (val) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)

  const handleSave = async () => {
    if (!selectedUser || !amount || parseFloat(amount) <= 0) {
      toast('Kişi ve tutar seçin', 'error'); return
    }
    setSaving(true)
    const staffMember = staff.find(s => s.id === selectedUser)
    try {
      await addDoc(collection(db, 'finance'), {
        type: activeTab,
        userId: selectedUser,
        userName: staffMember?.name || staffMember?.email || 'Bilinmiyor',
        amount: parseFloat(amount),
        note: note || '',
        date: today.toISOString(),
        period,
        enteredBy: user.uid,
        enteredByName: user.name || user.email,
        createdAt: new Date().toISOString()
      })
      const finSnap = await getDocs(collection(db, 'finance'))
      setRecords(finSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      setSelectedUser('')
      setAmount('')
      setNote('')
      setShowForm(false)
      toast('Kayıt eklendi!', 'success')
    } catch (e) {
      toast('Kayıt eklenemedi', 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'finance', id))
      setRecords(prev => prev.filter(r => r.id !== id))
      toast('Kayıt silindi', 'info')
    } catch (e) {
      toast('Silinemedi', 'error')
    }
  }

  const activeTabInfo = TABS.find(t => t.id === activeTab)

  // Kişi başı gruplu veriler
  const groupedByUser = {}
  filteredRecords.forEach(r => {
    if (!groupedByUser[r.userId]) groupedByUser[r.userId] = { name: r.userName, total: 0, count: 0 }
    groupedByUser[r.userId].total += r.amount || 0
    groupedByUser[r.userId].count++
  })

  // Aylık özet (her 3 tip için toplam)
  const monthlySummary = {}
  TABS.forEach(t => {
    monthlySummary[t.id] = records.filter(r => {
      if (r.type !== t.id) return false
      const rDate = new Date(r.date)
      return rDate.getMonth() === filterMonth && rDate.getFullYear() === filterYear
    }).reduce((sum, r) => sum + (r.amount || 0), 0)
  })

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>💰 Muhasebe</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Banka tahsilatı, marka ve normal prim yönetimi</p>
      </div>

      {/* Aylık Özet */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '1rem' }}>
        {TABS.map(t => (
          <div key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '0.75rem', borderRadius: '0.75rem', textAlign: 'center', cursor: 'pointer',
            border: `2px solid ${activeTab === t.id ? t.color : '#1e293b'}`,
            backgroundColor: activeTab === t.id ? `${t.color}15` : '#0f172a',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: t.color }}>{formatCurrency(monthlySummary[t.id])}</div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '0.125rem' }}>{t.label.split(' ').slice(1).join(' ')}</div>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div className="card" style={{ marginTop: '0.75rem', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          <button onClick={() => { if (filterMonth === 0) { setFilterMonth(11); setFilterYear(y => y - 1) } else setFilterMonth(m => m - 1) }} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', cursor: 'pointer', fontSize: '13px' }}>←</button>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc', minWidth: '140px', textAlign: 'center' }}>{MONTHS[filterMonth]} {filterYear}</span>
          <button onClick={() => { if (filterMonth === 11) { setFilterMonth(0); setFilterYear(y => y + 1) } else setFilterMonth(m => m + 1) }} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', cursor: 'pointer', fontSize: '13px' }}>→</button>
        </div>
      </div>

      {/* Sekmeler */}
      <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.75rem' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: '0.625rem', borderRadius: '0.5rem', fontSize: '12px', fontWeight: '600',
            border: `1px solid ${activeTab === t.id ? t.color : '#334155'}`,
            backgroundColor: activeTab === t.id ? `${t.color}15` : 'transparent',
            color: activeTab === t.id ? t.color : '#94a3b8',
            cursor: 'pointer', transition: 'all 0.15s ease'
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Seçili Sekme Bilgisi */}
      <div className="card" style={{ marginTop: '0.75rem', borderLeft: `4px solid ${activeTabInfo?.color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>{activeTabInfo?.label}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{activeTabInfo?.desc} • {activeTabInfo?.schedule}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: activeTabInfo?.color }}>{formatCurrency(totalAmount)}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{filteredRecords.length} kayıt</div>
          </div>
        </div>
      </div>

      {/* Kayıt Ekle Butonu */}
      {canEdit && (
        <button onClick={() => setShowForm(!showForm)} style={{
          width: '100%', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: '600',
          border: 'none', cursor: 'pointer', marginTop: '0.75rem',
          background: `linear-gradient(135deg, ${activeTabInfo?.color}, ${activeTabInfo?.color}cc)`,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          boxShadow: `0 4px 12px ${activeTabInfo?.color}40`
        }}>
          {showForm ? '✕ Kapat' : `➕ Yeni ${activeTabInfo?.label.split(' ').slice(1).join(' ')} Ekle`}
        </button>
      )}

      {/* Ekleme Formu */}
      {showForm && canEdit && (
        <div className="card" style={{ marginTop: '0.75rem', border: `2px solid ${activeTabInfo?.color}` }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>
            ➕ Yeni Kayıt Ekle — {activeTabInfo?.label}
          </h4>

          <div className="form-group">
            <label className="form-label">👤 Kişi Seçin</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="form-input">
              <option value="">Kişi seçin...</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.name || s.email} — {s.category || 'Genel'}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">💰 Tutar (₺)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="form-input" style={{ fontSize: '18px', fontWeight: '700' }} />
          </div>

          <div className="form-group">
            <label className="form-label">📝 Not (isteğe bağlı)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ek not..." className="form-input" />
          </div>

          <button onClick={handleSave} disabled={saving || !selectedUser || !amount} style={{
            width: '100%', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: '600',
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            backgroundColor: selectedUser && amount ? activeTabInfo?.color : '#334155',
            color: '#fff', opacity: selectedUser && amount ? 1 : 0.5
          }}>
            {saving ? '⏳ Kaydediliyor...' : '✅ Kaydet'}
          </button>
        </div>
      )}

      {/* Kişi Bazlı Özet */}
      {Object.keys(groupedByUser).length > 0 && (
        <div className="card" style={{ marginTop: '0.75rem' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>👤 Kişi Bazlı Toplam</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {Object.entries(groupedByUser).sort((a, b) => b[1].total - a[1].total).map(([userId, data]) => (
              <div key={userId} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.625rem 0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #1e293b'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: `${activeTabInfo?.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: activeTabInfo?.color }}>
                    {data.name?.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{data.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{data.count} kayıt</div>
                  </div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: activeTabInfo?.color }}>{formatCurrency(data.total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kayıt Listesi */}
      <div className="card" style={{ marginTop: '0.75rem' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>📋 Kayıtlar</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Yükleniyor...</div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Bu dönem için kayıt yok</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {filteredRecords.map(r => (
              <div key={r.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.625rem 0.75rem', borderRadius: '0.5rem', backgroundColor: '#0f172a', border: '1px solid #1e293b'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: `${activeTabInfo?.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: activeTabInfo?.color, flexShrink: 0 }}>
                    {r.userName?.substring(0, 1).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.userName}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {new Date(r.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                      {r.note ? ` • ${r.note}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: activeTabInfo?.color }}>{formatCurrency(r.amount)}</div>
                  {canEdit && (
                    <button onClick={() => handleDelete(r.id)} style={{
                      width: '24px', height: '24px', borderRadius: '50%', border: 'none',
                      backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer',
                      fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
