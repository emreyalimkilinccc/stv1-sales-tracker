'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { useToast } from '@/components/Toast'

export default function AyarlarPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [prefs, setPrefs] = useState({ sales: true, quota: true, cleaning: true, leave: true, sound: true })

  useEffect(() => {
    if (!user) return
    try {
      const saved = JSON.parse(localStorage.getItem('stv1-notif-prefs-' + user.uid) || '{}')
      if (Object.keys(saved).length > 0) setPrefs(p => ({ ...p, ...saved }))
    } catch (e) {}
  }, [user])

  const togglePref = (key) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] }
    setPrefs(newPrefs)
    try { localStorage.setItem('stv1-notif-prefs-' + user.uid, JSON.stringify(newPrefs)) } catch (e) {}
    toast(`${key === 'sound' ? '🔊 Ses ayarı' : '🔔 Bildirim'} güncellendi`, 'success')
  }

  if (!user) return null

  const settingGroups = [
    {
      title: '🔔 Bildirim Tercihleri',
      items: [
        { key: 'sales', label: 'Satış bildirimleri', desc: 'Yeni satış yapıldığında bildirim al', icon: '💰' },
        { key: 'quota', label: 'Kota uyarıları', desc: 'Kota yaklaştığında uyarı al', icon: '🎯' },
        { key: 'cleaning', label: 'Temizlik hatırlatması', desc: 'Temizlik zamanı geldiğinde hatırlat', icon: '🧹' },
        { key: 'leave', label: 'İzin talep bildirimi', desc: 'İzin talepleri için bildirim al', icon: '📅' }
      ]
    },
    {
      title: '🔊 Ses Ayarları',
      items: [
        { key: 'sound', label: 'Satış sesli bildirim', desc: 'Yeni satış geldiğinde ses çal', icon: '🔔' }
      ]
    }
  ]

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>🔧 Ayarlar</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Bildirim ve ses tercihlerini yönet</p>
      </div>

      {settingGroups.map((group, gi) => (
        <div key={gi} className="card" style={{ marginTop: '1rem' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>{group.title}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {group.items.map(item => (
              <div key={item.key} onClick={() => togglePref(item.key)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.875rem 1rem', borderRadius: '0.75rem', cursor: 'pointer',
                backgroundColor: prefs[item.key] ? 'rgba(59,130,246,0.08)' : '#0f172a',
                border: `1px solid ${prefs[item.key] ? 'rgba(59,130,246,0.3)' : '#334155'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{item.label}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{item.desc}</div>
                  </div>
                </div>
                <div style={{
                  width: '44px', height: '24px', borderRadius: '12px', position: 'relative',
                  backgroundColor: prefs[item.key] ? '#3b82f6' : '#334155',
                  transition: 'background-color 0.2s ease'
                }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff',
                    position: 'absolute', top: '2px',
                    left: prefs[item.key] ? '22px' : '2px',
                    transition: 'left 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Hızlı Erişim */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>⚡ Hızlı Erişim</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link href="/change-password" style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.875rem 1rem', borderRadius: '0.75rem',
            backgroundColor: '#0f172a', border: '1px solid #334155',
            color: '#f8fafc', textDecoration: 'none'
          }}>
            <span style={{ fontSize: '20px' }}>🔐</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Şifre Değiştir</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Hesap şifreni güncelle</div>
            </div>
          </Link>
          <Link href="/kullanim-talimati" style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.875rem 1rem', borderRadius: '0.75rem',
            backgroundColor: '#0f172a', border: '1px solid #334155',
            color: '#f8fafc', textDecoration: 'none'
          }}>
            <span style={{ fontSize: '20px' }}>📖</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Kullanım Talimatı</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Nasıl kullanılır öğren</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Hakkında */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: '14px', color: '#64748b' }}>STV1 Satış Takip Sistemi</div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '0.25rem' }}>Versiyon 2.0 — Temmuz 2026</div>
        </div>
      </div>
    </div>
  )
}
