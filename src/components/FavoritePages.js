'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ALL_PAGES = [
  { href: '/dashboard', icon: '📊', label: 'Veriler' },
  { href: '/sales', icon: '💰', label: 'Satış' },
  { href: '/kasko', icon: '🛡️', label: 'KASKO' },
  { href: '/mola', icon: '☕', label: 'Mola' },
  { href: '/teslim', icon: '📦', label: 'Teslim' },
  { href: '/gelen-urunler', icon: '📥', label: 'Gelen Ürünler' },
  { href: '/transfer', icon: '🚛', label: 'Transfer' },
  { href: '/performans', icon: '🏆', label: 'Performans' },
  { href: '/izin-talep', icon: '🗓️', label: 'İzin Talep' },
  { href: '/oylama', icon: '🗳️', label: 'Oylama' },
  { href: '/takvim', icon: '📅', label: 'Takvim' },
  { href: '/isiharitasi', icon: '🔥', label: 'Isı Haritası' },
  { href: '/musteriler', icon: '👥', label: 'Müşteriler' },
  { href: '/envanter', icon: '📦', label: 'Envanter' },
  { href: '/reports', icon: '📈', label: 'Raporlar' },
  { href: '/temizlik', icon: '🧹', label: 'Temizlik' },
  { href: '/doviz', icon: '💱', label: 'Döviz' },
  { href: '/kullanim-talimati', icon: '📖', label: 'Kullanım Talimatı' },
  { href: '/muhasebe', icon: '💰', label: 'Muhasebe' },
]

export default function FavoritePages() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [favorites, setFavorites] = useState([])
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    if (!user) return
    try {
      const saved = JSON.parse(localStorage.getItem('stv1-favorites-' + user.uid) || '[]')
      setFavorites(saved)
    } catch (e) {}
  }, [user])

  useEffect(() => {
    if (!user || !pathname) return
    // Her sayfa ziyaretinde sayacı artır
    try {
      const counts = JSON.parse(localStorage.getItem('stv1-page-counts-' + user.uid) || '{}')
      counts[pathname] = (counts[pathname] || 0) + 1
      localStorage.setItem('stv1-page-counts-' + user.uid, JSON.stringify(counts))
    } catch (e) {}
  }, [user, pathname])

  const toggleFavorite = (href) => {
    const newFavs = favorites.includes(href) ? favorites.filter(f => f !== href) : [...favorites, href]
    setFavorites(newFavs)
    try { localStorage.setItem('stv1-favorites-' + user.uid, JSON.stringify(newFavs)) } catch (e) {}
  }

  if (!user || favorites.length === 0) return null

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', padding: '0 0.25rem' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>⭐ Favorilerim</span>
          <button onClick={() => setShowPicker(!showPicker)} style={{
            fontSize: '11px', color: '#3b82f6', border: 'none', backgroundColor: 'transparent',
            cursor: 'pointer', fontWeight: '600'
          }}>
            {showPicker ? 'Kapat' : 'Düzenle'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {favorites.map(href => {
            const page = ALL_PAGES.find(p => p.href === href)
            if (!page) return null
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
                backgroundColor: pathname === href ? 'rgba(59,130,246,0.15)' : '#0f172a',
                border: `1px solid ${pathname === href ? 'rgba(59,130,246,0.3)' : '#1e293b'}`,
                textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s ease'
              }}>
                <span>{page.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: '500', color: pathname === href ? '#3b82f6' : '#94a3b8' }}>{page.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Favori Seçici */}
      {showPicker && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>⭐ Favori Sayfalarını Seç</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {ALL_PAGES.map(p => {
              const isFav = favorites.includes(p.href)
              return (
                <button key={p.href} onClick={() => toggleFavorite(p.href)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.375rem 0.625rem', borderRadius: '9999px', fontSize: '12px',
                  border: `1px solid ${isFav ? '#3b82f6' : '#334155'}`,
                  backgroundColor: isFav ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: isFav ? '#3b82f6' : '#94a3b8', cursor: 'pointer',
                  fontWeight: '500', transition: 'all 0.15s ease'
                }}>
                  {p.icon} {p.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
