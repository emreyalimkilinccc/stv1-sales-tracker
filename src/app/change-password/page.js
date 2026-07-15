'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/Toast'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth()
  const toast = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [birthday, setBirthday] = useState('')
  const [savingBirthday, setSavingBirthday] = useState(false)

  useEffect(() => {
    if (user?.birthday) {
      setBirthday(user.birthday)
    }
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) { toast('Şifre en az 6 karakter olmalı', 'error'); return }
    if (newPassword !== confirmPassword) { toast('Şifreler eşleşmiyor!', 'error'); return }
    setLoading(true)
    try {
      await changePassword(newPassword)
      toast('Şifreniz güncellendi!', 'success')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast('Şifre güncellenemedi: ' + err.message, 'error')
    } finally { setLoading(false) }
  }

  const saveBirthday = async () => {
    if (!birthday) { toast('Doğum tarihi seçin', 'error'); return }
    setSavingBirthday(true)
    try {
      await updateDoc(doc(db, 'user', user.uid), { birthday })
      toast('Doğum tarihiniz kaydedildi!', 'success')
    } catch (e) {
      toast('Kaydedilemedi', 'error')
    }
    setSavingBirthday(false)
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div>🔑 Giriş yapın</div></div>

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0f172a' }}>
      <div className="w-full max-w-sm">
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>⚙️</div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginBottom: '0.5rem' }}>Hesap Ayarları</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Hoş geldiniz, {user.name || user.email}</p>
        </div>

        {/* Doğum Tarihi */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>🎂 Doğum Tarihi</h3>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '0.75rem' }}>Doğum tarihinizi girin, takvimde ve ekip doğum günleri listesinde görünsün.</p>
          <div className="form-group">
            <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="form-input" style={{ colorScheme: 'dark' }} />
          </div>
          <button onClick={saveBirthday} disabled={savingBirthday || !birthday} style={{
            width: '100%', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '14px', fontWeight: '600',
            border: 'none', cursor: savingBirthday ? 'not-allowed' : 'pointer',
            background: birthday ? 'linear-gradient(135deg, #ec4899, #db2777)' : '#334155',
            color: '#fff', opacity: birthday ? 1 : 0.5
          }}>
            {savingBirthday ? '⏳ Kaydediliyor...' : '🎂 Doğum Tarihini Kaydet'}
          </button>
        </div>

        {/* Şifre Değiştir */}
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>🔒 Şifre Değiştir</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Yeni Şifre</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter" required className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Şifre Tekrar</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Şifrenizi tekrar girin" required className="form-input" />
            </div>
            {newPassword && newPassword.length < 6 && (
              <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '0.75rem' }}>⚠️ Şifre en az 6 karakter olmalı</div>
            )}
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '0.75rem' }}>⚠️ Şifreler eşleşmiyor</div>
            )}
            <button type="submit" disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
              className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? '⏳ Güncelleniyor...' : '🔒 Şifreyi Güncelle'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
