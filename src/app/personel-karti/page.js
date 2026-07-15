'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const ROLE_COLORS = { ADMIN: '#ef4444', MANAGER: '#f59e0b', STAFF: '#3b82f6' }
const ROLE_LABELS = { ADMIN: '👑 Yönetici', MANAGER: '👔 Müdür', STAFF: '👤 Personel' }

export default function PersonelKartiPage() {
  const { user } = useAuth()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const snap = await getDocs(collection(db, 'user'))
        setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) {}
      setLoading(false)
    }
    fetchStaff()
  }, [])

  if (!user) return null

  const filtered = staff.filter(s => {
    const q = search.toLowerCase()
    return (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q) || (s.salesCode || '').toLowerCase().includes(q)
  })

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  }

  const avatarColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>🪪 Personel Kartları</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Ekip üyelerinin bilgileri ve kartları</p>
      </div>

      {/* Arama */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 İsim, e-posta, kategori veya kod ile ara..." className="form-input" style={{ fontSize: '14px' }} />
      </div>

      {/* Kart Grid */}
      {loading ? (
        <div className="card" style={{ marginTop: '1rem', textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Yükleniyor...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {filtered.map((s, i) => (
            <div key={s.id} onClick={() => setSelected(selected === s.id ? null : s.id)} style={{
              borderRadius: '1rem', overflow: 'hidden', cursor: 'pointer',
              border: `2px solid ${selected === s.id ? ROLE_COLORS[s.role] || '#334155' : '#334155'}`,
              transition: 'all 0.2s ease', backgroundColor: '#1e293b'
            }}>
              {/* Header */}
              <div style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[s.role] || '#3b82f6'}, ${ROLE_COLORS[s.role] || '#3b82f6'}cc)`, padding: '1.5rem', textAlign: 'center' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 0.75rem', fontSize: '24px', fontWeight: '700', color: '#fff',
                  border: '3px solid rgba(255,255,255,0.3)'
                }}>
                  {getInitials(s.name)}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>{s.name || 'İsimsiz'}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '0.25rem' }}>{ROLE_LABELS[s.role] || 'Personel'}</div>
              </div>

              {/* Bilgiler */}
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {s.salesCode && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#94a3b8' }}>Kod</span>
                      <span style={{ color: '#f8fafc', fontWeight: '600', fontFamily: 'monospace' }}>{s.salesCode}</span>
                    </div>
                  )}
                  {s.email && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#94a3b8' }}>E-posta</span>
                      <span style={{ color: '#f8fafc', fontWeight: '500', fontSize: '12px' }}>{s.email}</span>
                    </div>
                  )}
                  {s.category && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#94a3b8' }}>Kategori</span>
                      <span style={{ color: '#06b6d4', fontWeight: '600' }}>{s.category}</span>
                    </div>
                  )}
                  {s.storeId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#94a3b8' }}>Mağaza</span>
                      <span style={{ color: '#f8fafc', fontWeight: '500' }}>{s.storeId}</span>
                    </div>
                  )}
                  {s.monthlyQuota > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#94a3b8' }}>Aylık Kota</span>
                      <span style={{ color: '#10b981', fontWeight: '600' }}>{s.monthlyQuota.toLocaleString('tr-TR')} ₺</span>
                    </div>
                  )}
                  {s.birthday && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#94a3b8' }}>Doğum Günü</span>
                      <span style={{ color: '#ec4899', fontWeight: '600' }}>🎂 {new Date(s.birthday).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
