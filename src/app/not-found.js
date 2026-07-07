'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0f172a' }}>
      <div className="text-center">
        <div style={{ fontSize: '96px', marginBottom: '1rem', opacity: 0.5 }}>🔍</div>
        <h1 style={{ fontSize: '48px', fontWeight: '800', color: '#f8fafc', marginBottom: '0.5rem' }}>404</h1>
        <p style={{ fontSize: '18px', color: '#94a3b8', marginBottom: '2rem' }}>Sayfa bulunamadı</p>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '2rem' }}>
          Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
        </p>
        <Link href="/dashboard" style={{
          display: 'inline-block', padding: '0.875rem 2rem', borderRadius: '9999px',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          color: '#fff', textDecoration: 'none', fontWeight: '600', fontSize: '16px',
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
          transition: 'transform 0.2s ease'
        }}>
          🏠 Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  )
}
