'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, getDocs, addDoc, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { formatCurrency } from '@/lib/utils'

export default function AdminPage() {
  const { user } = useAuth()
  const [stores, setStores] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('stores')
  const [showAddStore, setShowAddStore] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [newStore, setNewStore] = useState({ name: '', address: '', phone: '', monthlyQuota: '' })
  const [newUser, setNewUser] = useState({ salesCode: '', email: '', password: '', name: '', role: 'STAFF', storeId: '', monthlyQuota: '', category: '' })

  const CATEGORY_MAP = {
    'Emre YALIMKILINÇ': 'Giriş kat',
    'Derya DEMİR': 'Giriş kat',
    'Sevim TEKİN': 'Giriş kat',
    'Onur VARAN': 'Giriş kat',
    'Merve KARAASLAN': 'Giriş kat',
    'Bilge TURAN': 'Züccaciye',
    'ELİF DEMİR': 'Züccaciye',
    'Rabia ÇALHAN': 'Mobilya',
    'Nurdagül MENEKŞE': 'Mobilya',
    'Seda SOYDAN': 'Kasa',
    'Özge KEL': 'Kasa',
    'Şennur ŞAHİN': 'Kasa',
    'Betül Merve GÜNGÖR': 'Kasa'
  }

  const handleBulkCategorize = async () => {
    try {
      let updated = 0
      for (const u of users) {
        const cat = CATEGORY_MAP[u.name]
        if (cat && u.category !== cat) {
          await updateDoc(doc(db, 'user', u.id), { category: cat })
          updated++
        }
      }
      fetchData()
      alert(`${updated} kullanıcının kategorisi güncellendi!`)
    } catch (error) { alert('Hata: ' + error.message) }
  }

  useEffect(() => { if (user && ['ADMIN', 'MANAGER'].includes(user.role)) fetchData() }, [user])

  const fetchData = async () => {
    try {
      const s = await getDocs(collection(db, 'stores')); setStores(s.docs.map(d => ({ id: d.id, ...d.data() })))
      const u = await getDocs(collection(db, 'user')); setUsers(u.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
  }

  const handleAddStore = async (e) => {
    e.preventDefault()
    try { 
      await addDoc(collection(db, 'stores'), { 
        ...newStore, 
        monthlyQuota: parseFloat(newStore.monthlyQuota) || 0,
        createdAt: new Date().toISOString() 
      }); 
      setShowAddStore(false); 
      setNewStore({ name: '', address: '', phone: '', monthlyQuota: '' }); 
      fetchData() 
    } catch (error) { console.error(error) }
  }

  const [showReauthModal, setShowReauthModal] = useState(false)
  const [reauthPassword, setReauthPassword] = useState('')
  const [pendingAdminEmail, setPendingAdminEmail] = useState('')

  const handleAddUser = async (e) => {
    e.preventDefault()
    try {
      const email = `${newUser.salesCode}@stv1.local`
      const currentAdminEmail = user.email
      await createUserWithEmailAndPassword(auth, email, newUser.password)
      await setDoc(doc(db, 'user', email), { 
        name: newUser.name, 
        email: email, 
        salesCode: newUser.salesCode,
        role: newUser.role, 
        storeId: newUser.storeId,
        category: newUser.category,
        monthlyQuota: parseFloat(newUser.monthlyQuota) || 0,
        createdAt: new Date().toISOString() 
      })
      await firebaseSignOut(auth)
      setPendingAdminEmail(currentAdminEmail)
      setShowReauthModal(true)
      setShowAddUser(false)
      setNewUser({ salesCode: '', email: '', password: '', name: '', role: 'STAFF', storeId: '', monthlyQuota: '', category: '' })
      fetchData()
    } catch (error) { alert('Hata: ' + error.message) }
  }

  const handleReauth = async (e) => {
    e.preventDefault()
    try {
      await signInWithEmailAndPassword(auth, pendingAdminEmail, reauthPassword)
      setShowReauthModal(false)
      setReauthPassword('')
      setPendingAdminEmail('')
    } catch (error) { alert('Hata: ' + error.message) }
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    try { 
      await updateDoc(doc(db, 'user', editingUser.id), { 
        name: editingUser.name, 
        role: editingUser.role, 
        storeId: editingUser.storeId,
        monthlyQuota: parseFloat(editingUser.monthlyQuota) || 0
      }); 
      setEditingUser(null); 
      fetchData() 
    } catch (error) { alert('Hata: ' + error.message) }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return
    try { await deleteDoc(doc(db, 'user', userId)); fetchData() } catch (error) { alert('Hata: ' + error.message) }
  }

  const handleUpdateStoreQuota = async (storeId, newQuota) => {
    try {
      await updateDoc(doc(db, 'stores', storeId), { monthlyQuota: parseFloat(newQuota) || 0 })
      fetchData()
    } catch (error) { alert('Hata: ' + error.message) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>
  if (!['ADMIN', 'MANAGER'].includes(user?.role)) return <div className="min-h-screen flex items-center justify-center"><div style={{ color: '#ef4444' }}>🚫 Erişim yetkiniz yok</div></div>

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="page-header" style={{
        background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>⚙️ Yönetim Paneli</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Mağazalar, personel ve kota yönetimi</p>
      </div>

      <div className="flex" style={{ gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { key: 'stores', label: '🏪 Mağazalar', color: '#10b981' },
          { key: 'users', label: '👥 Personel', color: '#3b82f6' },
          { key: 'quotas', label: '🎯 Kotalar', color: '#f59e0b' }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '0.75rem 1rem', fontSize: '13px', fontWeight: '600', borderRadius: '0.75rem',
            border: `2px solid ${activeTab === tab.key ? tab.color : '#334155'}`,
            backgroundColor: activeTab === tab.key ? `${tab.color}15` : '#1e293b',
            color: activeTab === tab.key ? tab.color : '#94a3b8', cursor: 'pointer', textAlign: 'center',
            flex: '1', minWidth: '100px'
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* MAĞAZALAR SEKMESİ */}
      {activeTab === 'stores' && (
        <div>
          {user.role === 'ADMIN' && (
            <button onClick={() => setShowAddStore(!showAddStore)} style={{
              width: '100%', marginBottom: '1rem', padding: '0.875rem',
              background: showAddStore ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)',
              color: showAddStore ? '#94a3b8' : 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer'
            }}>
              {showAddStore ? '✕ Kapat' : '➕ Mağaza Ekle'}
            </button>
          )}

          {showAddStore && (
            <div className="card">
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>🏪 Yeni Mağaza</h3>
              <form onSubmit={handleAddStore}>
                <div className="form-group">
                  <label className="form-label">Mağaza Adı</label>
                  <input type="text" placeholder="Mağaza Adı" value={newStore.name} onChange={(e) => setNewStore(p => ({ ...p, name: e.target.value }))} required className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Adres</label>
                  <input type="text" placeholder="Adres" value={newStore.address} onChange={(e) => setNewStore(p => ({ ...p, address: e.target.value }))} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefon</label>
                  <input type="text" placeholder="Telefon" value={newStore.phone} onChange={(e) => setNewStore(p => ({ ...p, phone: e.target.value }))} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">🎯 Aylık Mağaza Kotası (TL)</label>
                  <input type="number" placeholder="Örn: 5000000" value={newStore.monthlyQuota} onChange={(e) => setNewStore(p => ({ ...p, monthlyQuota: e.target.value }))} className="form-input" />
                </div>
                <div className="flex" style={{ gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button type="button" onClick={() => setShowAddStore(false)} className="btn btn-secondary flex-1">İptal</button>
                  <button type="submit" className="btn btn-primary flex-1">💾 Kaydet</button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-3">
            {stores.filter(s => user.role === 'ADMIN' || s.id === user.storeId).map(s => (
              <div key={s.id} className="list-item" style={{ borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.375rem' }}>🏪 {s.name}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>📍 {s.address || '-'} {s.phone ? `• 📞 ${s.phone}` : ''}</div>
                <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '0.25rem' }}>
                  🎯 Aylık Kota: <span style={{ fontWeight: '600' }}>{formatCurrency(s.monthlyQuota || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PERSONEL SEKMESİ */}
      {activeTab === 'users' && (
        <div>
          <button onClick={() => { setShowAddUser(!showAddUser); setEditingUser(null) }} style={{
            width: '100%', marginBottom: '1rem', padding: '0.875rem',
            background: showAddUser ? '#334155' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: showAddUser ? '#94a3b8' : 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer'
          }}>
            {showAddUser ? '✕ Kapat' : '➕ Personel Ekle'}
          </button>
          <button onClick={handleBulkCategorize} style={{
            width: '100%', marginBottom: '1rem', padding: '0.875rem',
            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            color: 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer'
          }}>🏷️ Kategorileri Güncelle</button>

          {showAddUser && (
            <div className="card">
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>👤 Yeni Personel</h3>
              <form onSubmit={handleAddUser}>
                <div className="form-group">
                  <label className="form-label">Satış Kodu</label>
                  <input type="text" placeholder="Satış Kodu (ör: 2646)" value={newUser.salesCode} onChange={(e) => setNewUser(p => ({ ...p, salesCode: e.target.value }))} required className="form-input" inputMode="numeric" pattern="[0-9]*" />
                </div>
                <div className="form-group">
                  <label className="form-label">Ad Soyad</label>
                  <input type="text" placeholder="Ad Soyad" value={newUser.name} onChange={(e) => setNewUser(p => ({ ...p, name: e.target.value }))} required className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Şifre</label>
                  <input type="password" placeholder="Şifre (varsayılan: 123456)" value={newUser.password} onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} required className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select value={newUser.role} onChange={(e) => setNewUser(p => ({ ...p, role: e.target.value }))} className="form-input" disabled={user.role === 'MANAGER'}>
                    <option value="STAFF">👤 Personel</option>
                    {user.role === 'ADMIN' && <option value="MANAGER">👔 Mağaza Müdürü</option>}
                    {user.role === 'ADMIN' && <option value="ADMIN">👑 Yönetici</option>}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Mağaza</label>
                  <select value={newUser.storeId} onChange={(e) => setNewUser(p => ({ ...p, storeId: e.target.value }))} className="form-input">
                    <option value="">🏪 Mağaza Seçin</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">🏷️ Kategori</label>
                  <select value={newUser.category} onChange={(e) => setNewUser(p => ({ ...p, category: e.target.value }))} className="form-input">
                    <option value="">Kategori Seçin</option>
                    <option value="Giriş kat">🚪 Giriş kat</option>
                    <option value="Züccaciye">🍳 Züccaciye</option>
                    <option value="Kasa">🗄️ Kasa</option>
                    <option value="Mobilya">🛋️ Mobilya</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">🎯 Aylık Kota (TL)</label>
                  <input type="number" placeholder="Örn: 500000" value={newUser.monthlyQuota} onChange={(e) => setNewUser(p => ({ ...p, monthlyQuota: e.target.value }))} className="form-input" />
                </div>
                <div className="flex" style={{ gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button type="button" onClick={() => setShowAddUser(false)} className="btn btn-secondary flex-1">İptal</button>
                  <button type="submit" className="btn btn-primary flex-1">💾 Kaydet</button>
                </div>
              </form>
            </div>
          )}

          {editingUser && (
            <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>✏️ Düzenle: {editingUser.name}</h3>
              <form onSubmit={handleUpdateUser}>
                <div className="form-group">
                  <label className="form-label">Satış Kodu</label>
                  <input type="text" value={editingUser.salesCode || '-'} disabled className="form-input" style={{ backgroundColor: '#1e293b', color: '#64748b' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ad Soyad</label>
                  <input type="text" placeholder="Ad Soyad" value={editingUser.name} onChange={(e) => setEditingUser(p => ({ ...p, name: e.target.value }))} required className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select value={editingUser.role} onChange={(e) => setEditingUser(p => ({ ...p, role: e.target.value }))} className="form-input" disabled={user.role === 'MANAGER'}>
                    <option value="STAFF">👤 Personel</option>
                    {user.role === 'ADMIN' && <option value="MANAGER">👔 Mağaza Müdürü</option>}
                    {user.role === 'ADMIN' && <option value="ADMIN">👑 Yönetici</option>}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Mağaza</label>
                  <select value={editingUser.storeId || ''} onChange={(e) => setEditingUser(p => ({ ...p, storeId: e.target.value }))} className="form-input">
                    <option value="">🏪 Mağaza Seçin</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">🏷️ Kategori</label>
                  <select value={editingUser.category || ''} onChange={(e) => setEditingUser(p => ({ ...p, category: e.target.value }))} className="form-input">
                    <option value="">Kategori Seçin</option>
                    <option value="Giriş kat">🚪 Giriş kat</option>
                    <option value="Züccaciye">🍳 Züccaciye</option>
                    <option value="Kasa">🗄️ Kasa</option>
                    <option value="Mobilya">🛋️ Mobilya</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">🎯 Aylık Kota (TL)</label>
                  <input type="number" placeholder="Örn: 500000" value={editingUser.monthlyQuota || ''} onChange={(e) => setEditingUser(p => ({ ...p, monthlyQuota: e.target.value }))} className="form-input" />
                </div>
                <div className="flex" style={{ gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button type="button" onClick={() => setEditingUser(null)} className="btn btn-secondary flex-1">İptal</button>
                  <button type="submit" className="btn btn-primary flex-1">💾 Güncelle</button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-3">
            {users.filter(u => user.role === 'ADMIN' || u.storeId === user.storeId).map(u => (
              <div key={u.id} className="list-item" style={{ borderLeft: `4px solid ${u.role === 'ADMIN' ? '#ef4444' : u.role === 'MANAGER' ? '#f59e0b' : '#3b82f6'}` }}>
                <div className="flex justify-between items-start" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>
                      {u.role === 'ADMIN' ? '👑' : u.role === 'MANAGER' ? '👔' : '👤'} {u.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>
                      🔢 Satış Kodu: <span style={{ color: '#3b82f6', fontWeight: '600' }}>{u.salesCode || '-'}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '0.25rem' }}>
                      🎯 Aylık Kota: <span style={{ fontWeight: '600' }}>{formatCurrency(u.monthlyQuota || 0)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
                    <div style={{
                      padding: '0.375rem 0.75rem', borderRadius: '9999px',
                      fontSize: '11px', fontWeight: '600',
                      backgroundColor: u.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.15)' : u.role === 'MANAGER' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: u.role === 'ADMIN' ? '#fca5a5' : u.role === 'MANAGER' ? '#fcd34d' : '#93c5fd'
                    }}>
                      {u.role === 'ADMIN' ? 'Yönetici' : u.role === 'MANAGER' ? 'Mağaza Müdürü' : 'Personel'}
                    </div>
                    {u.category && (
                      <div style={{
                        padding: '0.25rem 0.625rem', borderRadius: '9999px',
                        fontSize: '10px', fontWeight: '600',
                        backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd',
                        border: '1px solid rgba(139, 92, 246, 0.3)'
                      }}>
                        🏷️ {u.category}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center" style={{ borderTop: '1px solid #334155', paddingTop: '0.75rem' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>🏪 {stores.find(s => s.id === u.storeId)?.name || '-'}</div>
                  {user.role === 'ADMIN' || (user.role === 'MANAGER' && u.role !== 'ADMIN') ? (
                    <div className="flex" style={{ gap: '0.5rem' }}>
                      <button onClick={() => { setEditingUser(u); setShowAddUser(false) }} style={{
                        padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontSize: '12px',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6',
                        border: 'none', cursor: 'pointer', fontWeight: '500'
                      }}>✏️ Düzenle</button>
                      <button onClick={() => handleDeleteUser(u.id)} style={{
                        padding: '0.5rem 0.875rem', borderRadius: '0.5rem', fontSize: '12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
                        border: 'none', cursor: 'pointer', fontWeight: '500'
                      }}>🗑️ Sil</button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KOTALAR SEKMESİ */}
      {activeTab === 'quotas' && (
        <div>
          <div className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid #f59e0b' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>🏪 Mağaza Kotaları</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '1rem' }}>Her mağazanın aylık satış hedefini belirleyin</p>
            
            <div className="space-y-3">
              {stores.filter(s => user.role === 'ADMIN' || s.id === user.storeId).map(s => (
                <div key={s.id} className="list-item" style={{ borderLeft: '4px solid #10b981', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>🏪 {s.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="number" 
                        value={s.monthlyQuota || ''} 
                        onChange={(e) => handleUpdateStoreQuota(s.id, e.target.value)}
                        placeholder="0"
                        style={{ 
                          width: '150px', padding: '0.5rem', borderRadius: '0.5rem',
                          backgroundColor: '#334155', border: '1px solid #475569',
                          color: '#f8fafc', fontSize: '14px', textAlign: 'right'
                        }}
                      />
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>TL</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '0.5rem' }}>
                    📊 Hedef: {formatCurrency(s.monthlyQuota || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>👤 Personel Kotaları</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '1rem' }}>Her personelin aylık satış hedefini belirleyin</p>
            
            <div className="space-y-3">
              {users.filter(u => user.role === 'ADMIN' || u.storeId === user.storeId).filter(u => u.role === 'STAFF').map(u => (
                <div key={u.id} className="list-item" style={{ borderLeft: '4px solid #3b82f6', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>👤 {u.name}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>🏪 {stores.find(s => s.id === u.storeId)?.name || '-'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="number" 
                        value={u.monthlyQuota || ''} 
                        onChange={async (e) => {
                          try {
                            await updateDoc(doc(db, 'user', u.id), { monthlyQuota: parseFloat(e.target.value) || 0 })
                            fetchData()
                          } catch (error) { console.error(error) }
                        }}
                        placeholder="0"
                        style={{ 
                          width: '150px', padding: '0.5rem', borderRadius: '0.5rem',
                          backgroundColor: '#334155', border: '1px solid #475569',
                          color: '#f8fafc', fontSize: '14px', textAlign: 'right'
                        }}
                      />
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>TL</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '0.5rem' }}>
                    📊 Hedef: {formatCurrency(u.monthlyQuota || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Admin Tekrar Giriş Modal'ı */}
      {showReauthModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1e293b', borderRadius: '1rem',
            padding: '2rem', width: '100%', maxWidth: '400px',
            border: '1px solid #334155'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>
              🔐 Tekrar Giriş Yap
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '1rem' }}>
              Yeni kullanıcı eklendi. Devam etmek için şifrenizi girin.
            </p>
            <form onSubmit={handleReauth}>
              <div className="form-group">
                <label className="form-label">Şifre</label>
                <input
                  type="password"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  placeholder="Şifreniz"
                  className="form-input"
                  required
                />
              </div>
              <div className="flex" style={{ gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => { setShowReauthModal(false); window.location.href = '/login' }}
                  className="btn btn-secondary flex-1">
                  Giriş Sayfası
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Giriş Yap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
