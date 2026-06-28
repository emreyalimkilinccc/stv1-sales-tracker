'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'

export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor')
      return
    }

    setLoading(true)
    try {
      await changePassword(newPassword)
      setSuccess('Şifreniz başarıyla güncellendi!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError('Şifre güncellenirken hata oluştu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="page-header" style={{
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>🔐 Şifre Değiştir</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Güvenliğiniz için şifrenizi güncelleyin</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.75rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', color: 'white', fontWeight: '600'
          }}>
            {user?.name?.charAt(0) || '?'}
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>{user?.name}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Satış Kodu: {user?.salesCode}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5', padding: '0.875rem', borderRadius: '0.75rem',
              fontSize: '13px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          {success && (
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#6ee7b7', padding: '0.875rem', borderRadius: '0.75rem',
              fontSize: '13px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              <span>✅</span> {success}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">🔒 Yeni Şifre</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="En az 6 karakter"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">🔒 Şifre Tekrar</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifrenizi tekrar girin"
              className="form-input"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {loading ? '⏳ Güncelleniyor...' : '💾 Şifremi Güncelle'}
          </button>
        </form>
      </div>
    </div>
  )
}
