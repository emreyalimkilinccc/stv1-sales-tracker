'use client'

import { formatCurrency } from '@/lib/utils'

const BADGES = [
  { id: 'topSeller', name: 'Satış Kralı', icon: '👑', desc: 'En çok satış yapan', condition: (staff, all) => staff.amount === Math.max(...all.map(s => s.amount)) && all.length > 1 },
  { id: 'consistent', name: 'İstikrar Yıldızı', icon: '⭐', desc: 'Her gün satış yapan', condition: (staff) => staff.count >= 20 },
  { id: 'highValue', name: 'Değerli Satış', icon: '💎', desc: 'Ortalama satış tutarı yüksek', condition: (staff) => staff.count > 0 && (staff.amount / staff.count) > 5000 },
  { id: 'firstSale', name: 'İlk Adım', icon: '🎯', desc: 'En az 1 satış yapan', condition: (staff) => staff.count >= 1 },
  { id: 'teamPlayer', name: 'Takım Oyuncusu', icon: '🤝', desc: 'Orta düzey satış', condition: (staff) => staff.count >= 5 && staff.count < 20 }
]

const GOAL_PRESETS = [
  { label: '50.000 TL', value: 50000 },
  { label: '100.000 TL', value: 100000 },
  { label: '250.000 TL', value: 250000 },
  { label: '500.000 TL', value: 500000 },
  { label: '1.000.000 TL', value: 1000000 }
]

export default function LeaderBoard({ staffStats, userGoal, onSetGoal }) {
  if (!staffStats || staffStats.length === 0) return null

  const maxAmount = staffStats[0]?.amount || 1

  return (
    <div className="space-y-4">
      {/* Hedef Belirleme */}
      <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '18px' }}>🎯</span>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>Aylık Hedefim</h3>
        </div>
        {userGoal > 0 ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Hedef: <strong style={{ color: '#f59e0b' }}>{formatCurrency(userGoal)}</strong></span>
              <button onClick={() => onSetGoal(0)} style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Değiştir</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {GOAL_PRESETS.map(g => (
              <button key={g.value} onClick={() => onSetGoal(g.value)} style={{
                padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '12px', fontWeight: '600',
                backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)',
                cursor: 'pointer'
              }}>{g.label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Liderlik Tablosu */}
      <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1.25rem', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '18px' }}>🏆</span>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc' }}>Liderlik Tablosu</h3>
        </div>
        <div className="space-y-3">
          {staffStats.map((staff, index) => {
            const pct = (staff.amount / maxAmount) * 100
            const earnedBadges = BADGES.filter(b => b.condition(staff, staffStats))
            const colors = ['#f59e0b', '#94a3b8', '#b45309', '#3b82f6', '#8b5cf6']
            const rankColor = colors[index] || '#3b82f6'

            return (
              <div key={staff.userId} style={{
                backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '0.875rem',
                border: index === 0 ? '2px solid rgba(245, 158, 11, 0.3)' : '1px solid #334155'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  {/* Sıra */}
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    backgroundColor: `${rankColor}20`, border: `2px solid ${rankColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: '700', color: rankColor, flexShrink: 0
                  }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </div>

                  {/* İsim + Rozetler */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {staff.userName}
                    </div>
                    {earnedBadges.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        {earnedBadges.map(b => (
                          <span key={b.id} title={b.desc} style={{
                            fontSize: '14px', cursor: 'help'
                          }}>{b.icon}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tutar */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: rankColor }}>{formatCurrency(staff.amount)}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{staff.count} satış</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: index === 0 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #3b82f6, #2563eb)',
                    borderRadius: '3px', transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
