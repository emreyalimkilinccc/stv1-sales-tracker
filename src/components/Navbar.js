'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { usePathname } from 'next/navigation'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState(0)

  const isActive = (path) => pathname === path

  useEffect(() => {
    if (!user) return
    
    // Bildirimleri dinle - sentBy alanı olan satışlar
    const q = query(collection(db, 'sales'), where('sentBy', '!=', null))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0
      snapshot.forEach(doc => {
        const data = doc.data()
        // Düzenlenmemiş satışları say (lastEditedBy yoksa)
        if (!data.lastEditedBy) {
          // Mağaza müdürü ise sadece kendi mağazasını saysın
          if (user.role === 'MANAGER') {
            if (data.storeId === user.storeId || !data.storeId) {
              count++
            }
          } else {
            // Yönetici tümünü görsün
            count++
          }
        }
      })
      setNotifications(count)
      
      // Sesli bildirim - yeni bildirim geldiğinde
      if (count > 0) {
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2JkI+LfXR0e4aXnJqUin11dXyGmZ2blYl8dXV9h5qem5SJfXR1fIeanpuUin11dXyHmp6blIp9dXV8')
          audio.volume = 0.3
          audio.play().catch(() => {})
        } catch (e) {}
      }
    })

    return () => unsubscribe()
  }, [user])

  if (!user) return null

  const navItems = [
    { href: '/dashboard', label: 'Veriler', icon: '📊' },
    { href: '/sales', label: 'Satış', icon: '💰' },
    { href: '/reports', label: 'Raporlar', icon: '📈' },
    { href: '/lottery', label: 'Çekiliş', icon: '🎰', adminOnly: true },
    { href: '/admin', label: 'Yönetim', icon: '⚙️' },
  ]

  const filteredItems = navItems.filter(item => {
    if (item.href === '/reports' && !['MANAGER', 'ADMIN'].includes(user.role)) return false
    if (item.href === '/admin' && !['MANAGER', 'ADMIN'].includes(user.role)) return false
    if (item.adminOnly && !['MANAGER', 'ADMIN'].includes(user.role)) return false
    return true
  })

  return (
    <nav style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="px-4">
        <div className="flex justify-between items-center" style={{ height: '60px' }}>
          <Link href="/dashboard" className="flex items-center" style={{ gap: '0.625rem' }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
            }}>
              <span style={{ fontSize: '18px' }}>🏪</span>
            </div>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>STV1</span>
          </Link>

          <div className="flex items-center" style={{ gap: '0.5rem' }}>
            {/* Zil İkonu - Bildirimler */}
            {['MANAGER', 'ADMIN'].includes(user.role) && (
              <div style={{ position: 'relative' }}>
                <Link href="/reports" style={{
                  width: '38px', height: '38px',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  fontSize: '18px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  textDecoration: 'none'
                }}>
                  🔔
                </Link>
                {notifications > 0 && (
                  <div style={{
                    position: 'absolute', top: '-4px', right: '-4px',
                    width: '20px', height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '700',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #1e293b'
                  }}>
                    {notifications}
                  </div>
                )}
              </div>
            )}

            {/* Rol Badge */}
            <div style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: '600',
              backgroundColor: user.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.15)' : user.role === 'MANAGER' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              color: user.role === 'ADMIN' ? '#fca5a5' : user.role === 'MANAGER' ? '#fcd34d' : '#93c5fd',
              border: `1px solid ${user.role === 'ADMIN' ? 'rgba(239, 68, 68, 0.3)' : user.role === 'MANAGER' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`
            }}>
              {user.role === 'ADMIN' ? '👑 Yönetici' : user.role === 'MANAGER' ? '👔 Müdür' : '👤 Personel'}
            </div>

            {/* Menü Butonu */}
            <button onClick={() => setMenuOpen(!menuOpen)} style={{
              width: '38px', height: '38px',
              borderRadius: '10px',
              border: '1px solid #334155',
              backgroundColor: menuOpen ? '#334155' : 'transparent',
              color: '#94a3b8',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div style={{ backgroundColor: '#1e293b', borderTop: '1px solid #334155', padding: '0.75rem' }}>
          {filteredItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center"
              style={{
                color: isActive(item.href) ? '#3b82f6' : '#e2e8f0',
                backgroundColor: isActive(item.href) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                borderRadius: '0.75rem',
                fontSize: '15px', fontWeight: '500', textDecoration: 'none',
                padding: '0.875rem 1rem',
                marginBottom: '0.375rem',
                gap: '0.75rem'
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          <div style={{ borderTop: '1px solid #334155', marginTop: '0.75rem', paddingTop: '0.75rem' }}>
            <div style={{ padding: '0 1rem', marginBottom: '0.5rem' }}>
              <p style={{ fontSize: '13px', color: '#94a3b8' }}>Satış Kodu: <span style={{ color: '#3b82f6', fontWeight: '600' }}>{user.salesCode}</span></p>
            </div>
            <Link
              href="/change-password"
              onClick={() => setMenuOpen(false)}
              className="flex items-center"
              style={{
                color: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderRadius: '0.75rem',
                fontSize: '15px', fontWeight: '500', textDecoration: 'none',
                padding: '0.875rem 1rem',
                marginBottom: '0.375rem',
                gap: '0.75rem'
              }}
            >
              <span>🔐</span>
              <span>Şifre Değiştir</span>
            </Link>
            <button onClick={() => { signOut(); setMenuOpen(false) }} className="flex items-center" style={{
              width: '100%', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: 'none', borderRadius: '0.75rem', fontSize: '15px', cursor: 'pointer',
              padding: '0.875rem 1rem', gap: '0.75rem'
            }}>
              <span>🚪</span>
              <span>Çıkış Yap</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
