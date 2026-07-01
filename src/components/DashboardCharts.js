'use client'

import { formatCurrency } from '@/lib/utils'

const categoryColors = {
  'Giriş kat': '#3b82f6',
  'Züccaciye': '#8b5cf6',
  'Kasa': '#10b981',
  'Mobilya': '#f59e0b',
  'Diğer': '#64748b'
}

export default function DashboardCharts({ dailyStats, staffStats, categoryStats }) {
  if (!dailyStats || dailyStats.length === 0) {
    return (
      <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '2.5rem', border: '1px solid #334155', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📭</div>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Henüz veri bulunmuyor</p>
      </div>
    )
  }

  const maxAmount = Math.max(...dailyStats.map(d => d.amount))
  const totalCatAmount = categoryStats ? categoryStats.reduce((sum, c) => sum + c.amount, 0) : 0

  const handlePrint = () => window.print()

  return (
    <div className="space-y-4" id="dashboard-charts">
      {/* Dışa Aktar Butonu */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handlePrint} style={{
          padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '12px', fontWeight: '600',
          backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)',
          cursor: 'pointer'
        }}>🖨️ Yazdır / PDF</button>
      </div>

      {/* Günlük Satışlar */}
      <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #334155' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1.25rem' }}>📊 Günlük Satışlar</h3>
        <div className="space-y-4">
          {dailyStats.slice(-7).map((day, index) => (
            <div key={day.date} className="flex items-center">
              <div style={{ width: '65px', fontSize: '12px', color: '#94a3b8' }}>
                {new Date(day.date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' })}
              </div>
              <div style={{ flex: 1, margin: '0 0.75rem' }}>
                <div style={{ height: '28px', backgroundColor: '#0f172a', borderRadius: '0.5rem', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(day.amount / maxAmount) * 100}%`,
                    background: `linear-gradient(90deg, ${index === 0 ? '#f59e0b, #d97706' : index === 1 ? '#3b82f6, #2563eb' : '#8b5cf6, #7c3aed'})`,
                    borderRadius: '0.5rem',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
              <div style={{ width: '80px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>
                {formatCurrency(day.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kategori Dağılımı */}
      {categoryStats && categoryStats.length > 0 && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #334155' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1.25rem' }}>🏷️ Kategori Dağılımı</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            {categoryStats.map((cat) => {
              const pct = totalCatAmount > 0 ? ((cat.amount / totalCatAmount) * 100) : 0
              const color = categoryColors[cat.category] || '#64748b'
              return (
                <div key={cat.category} style={{ flex: '1 1 140px', backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '0.875rem', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }} />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>{cat.category}</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color, marginBottom: '0.25rem' }}>{formatCurrency(cat.amount)}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{cat.count} satış • %{pct.toFixed(1)}</div>
                  <div style={{ height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden', marginTop: '0.5rem' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Personel Sıralaması */}
      {staffStats && staffStats.length > 0 && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #334155' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1.25rem' }}>🏆 Personel Sıralaması</h3>
          <div className="space-y-4">
            {staffStats.map((staff, index) => (
              <div key={staff.userId} className="flex items-center">
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: '700',
                  backgroundColor: index === 0 ? 'rgba(245, 158, 11, 0.2)' : index === 1 ? 'rgba(148, 163, 184, 0.2)' : index === 2 ? 'rgba(180, 83, 9, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                  color: index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#3b82f6'
                }}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                </div>
                <div style={{ width: '90px', fontSize: '13px', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: '0.75rem' }}>
                  {staff.userName}
                </div>
                {index === 0 && (
                  <span style={{ padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '9px', fontWeight: '600', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', marginLeft: '0.375rem' }}>
                    ⭐ Ayın Personeli
                  </span>
                )}
                <div style={{ flex: 1, margin: '0 0.75rem' }}>
                  <div style={{ height: '24px', backgroundColor: '#0f172a', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(staff.amount / staffStats[0].amount) * 100}%`,
                      background: index === 0 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                      borderRadius: '0.5rem'
                    }} />
                  </div>
                </div>
                <div style={{ width: '80px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>
                  {formatCurrency(staff.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
