'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try { await signIn(email, password); router.push('/dashboard') }
    catch (err) { setError('Geçersiz e-posta veya şifre') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0f172a' }}>
      <div className="w-full max-w-sm">
        <div className="text-center" style={{ marginBottom: '2rem' }}>
          <div style={{
            width: '80px', height: '80px', margin: '0 auto 1.5rem',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
          }}>
            <span style={{ fontSize: '40px' }}>🏪</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#f8fafc', marginBottom: '0.5rem' }}>STV1</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Satış Takip Sistemi</p>
        </div>

        <div style={{
          backgroundColor: '#1e293b', borderRadius: '1.25rem',
          padding: '1.75rem', border: '1px solid #334155',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5', padding: '0.875rem',
                borderRadius: '0.75rem', fontSize: '13px',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginBottom: '1.25rem'
              }}>
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">📧 E-posta</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@email.com" className="form-input" />
            </div>

            <div className="form-group">
              <label className="form-label">🔒 Şifre</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className="form-input" />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}>
              {loading ? '⏳ Giriş yapılıyor...' : '🚀 Giriş Yap'}
            </button>
          </form>
        </div>

        <p className="text-center" style={{ color: '#475569', fontSize: '11px', marginTop: '1.5rem' }}>© 2026 STV1 Satış Takip Sistemi</p>
      </div>
    </div>
  )
}
