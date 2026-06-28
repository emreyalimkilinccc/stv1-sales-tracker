'use client'

import { formatCurrency } from '@/lib/utils'

export default function DashboardCharts({ dailyStats, staffStats }) {
  if (!dailyStats || dailyStats.length === 0) {
    return (
      <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '2.5rem', border: '1px solid #334155', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📭</div>
        <p style={{ color: '#64748b', fontSize: '14px' }}>Henüz veri bulunmuyor</p>
      </div>
    )
  }

  const maxAmount = Math.max(...dailyStats.map(d => d.amount))

  return (
    <div className="space-y-4">
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
