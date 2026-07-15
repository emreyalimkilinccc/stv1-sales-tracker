'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/Toast'

export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth()
  const toast = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

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

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div>🔑 Giriş yapın</div></div>

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0f172a' }}>
      <div className="w-full max-w-sm">
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🔑</div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', marginBottom: '0.5rem' }}>Şifre Değiştir</h1>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Hoş geldiniz, {user.name || user.email}</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">🔒 Yeni Şifre</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="En az 6 karakter" required className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">🔒 Şifre Tekrar</label>
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
