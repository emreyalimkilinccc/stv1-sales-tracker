'use client'

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: '#0f172a',
      borderTop: '1px solid #1e293b',
      padding: '2rem 1.5rem',
      marginTop: '2rem'
    }}>
      <div style={{ maxWidth: '7xl', margin: '0 auto' }}>
        {/* Üst Kısım */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Sol - Marka */}
          <div style={{ maxWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
              }}>
                <span style={{ fontSize: '18px' }}>🏪</span>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>STV1</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Mağaza Satış Takip Sistemi</div>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
              Mağaza personelinin günlük satışlarını girebildiği, yöneticilerin tüm satışları takip edebildiği profesyonel yazılım çözümü.
            </p>
          </div>

          {/* Orta - Geliştirici */}
          <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
            <div style={{
              padding: '1rem 1.5rem', borderRadius: '1rem',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '0.375rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Geliştirici</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', marginBottom: '0.5rem' }}>👨‍💻 Emre YALIMKILINÇ</div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="mailto:emreyalimkilinc@gmail.com" style={{
                  fontSize: '12px', color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem',
                  transition: 'color 0.2s ease'
                }}>
                  📧 <span style={{ color: '#3b82f6' }}>emreyalimkilinc@gmail.com</span>
                </a>
                <a href="https://github.com/emreyalimkilinccc" target="_blank" rel="noopener noreferrer" style={{
                  fontSize: '12px', color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.375rem',
                  transition: 'color 0.2s ease'
                }}>
                  🔗 <span style={{ color: '#3b82f6' }}>GitHub</span>
                </a>
              </div>
            </div>
          </div>

          {/* Sağ - Linkler */}
          <div style={{ minWidth: '140px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>Sayfalar</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {[
                { label: 'Veriler', icon: '📊' },
                { label: 'Satış', icon: '💰' },
                { label: 'Raporlar', icon: '📈' },
                { label: 'Temizlik', icon: '🧹' },
                { label: 'Oylama', icon: '🗳️' },
                { label: 'Çekiliş', icon: '🎰' },
                { label: 'İzin Talep', icon: '📅' }
              ].map(item => (
                <span key={item.label} style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  {item.icon} {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Çizgi */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #334155, transparent)', marginBottom: '1rem' }} />

        {/* Alt Kısım */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '11px', color: '#475569' }}>
            © 2026 STV1. Tüm hakları saklıdır.
          </div>
          <div style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ color: '#ef4444' }}>❤️</span> Vercel ile geliştirilmiştir
          </div>
        </div>
      </div>
    </footer>
  )
}
