'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatCurrency } from '@/lib/utils'

const LEVELS = [
  { name: 'Bronz Satıcı', icon: '🥉', min: 0, color: '#cd7f32' },
  { name: 'Gümüş Satıcı', icon: '🥈', min: 100, color: '#c0c0c0' },
  { name: 'Altın Satıcı', icon: '🥇', min: 500, color: '#ffd700' },
  { name: 'Elmas Satıcı', icon: '💎', min: 1500, color: '#b9f2ff' },
  { name: 'efsane Satıcı', icon: '🏆', min: 5000, color: '#ff6b35' }
]

const BADGES = [
  { id: 'first_sale', name: 'İlk Adım', icon: '🎯', desc: 'İlk satışını yap', check: (s) => s.totalSales >= 1 },
  { id: '10_sales', name: '10 Satış', icon: '🔟', desc: '10 satış tamamla', check: (s) => s.totalSales >= 10 },
  { id: '50_sales', name: '50 Satış', icon: '⭐', desc: '50 satış tamamla', check: (s) => s.totalSales >= 50 },
  { id: '100_sales', name: '100 Satış', icon: '💯', desc: '100 satış tamamla', check: (s) => s.totalSales >= 100 },
  { id: 'quota_king', name: 'Kota Kralı', icon: '👑', desc: 'Kota hedefini aş', check: (s) => s.quotaExceeded },
  { id: 'week_warrior', name: 'Hafta Savaşçısı', icon: '⚔️', desc: 'Bu hafta her gün satış yap', check: (s) => s.weeklyDays >= 5 },
  { id: 'big_sale', name: 'Büyük Satış', icon: '💰', desc: 'Tek seferde 50.000+ TL satış', check: (s) => s.maxSingleSale >= 50000 },
  { id: 'category_master', name: 'Kategori Ustası', icon: '🏅', desc: 'Tüm kategorilerde satış yap', check: (s) => s.categoriesUsed >= 4 }
]

const DAILY_TASKS = [
  { id: 'sale_5', name: '5 satış yap', target: 5, icon: '📦', points: 50 },
  { id: 'amount_50k', name: '50.000 TL satış yap', target: 50000, icon: '💰', points: 100 },
  { id: 'bonus_3', name: '3 bonus ürün sat', target: 3, icon: '🎁', points: 30 }
]

export default function GamificationPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchStats()
  }, [user])

  const fetchStats = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'sales'), where('userId', '==', user.uid)))
      const sales = snap.docs.map(d => d.data())

      const totalSales = sales.length
      const totalAmount = sales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
      const maxSingleSale = Math.max(...sales.map(s => parseFloat(s.amount) || 0), 0)
      const totalBonus = sales.reduce((sum, s) => sum + (parseInt(s.bonusItemCount) || 0), 0)

      const categories = new Set(sales.map(s => s.category).filter(Boolean))
      const categoriesUsed = categories.size

      const userQuota = user.monthlyQuota || 0
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const monthSales = sales.filter(s => s.date >= monthStart)
      const monthAmount = monthSales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
      const quotaExceeded = userQuota > 0 && monthAmount > userQuota

      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay() + 1)
      const weekStr = weekStart.toISOString().split('T')[0]
      const weekSales = sales.filter(s => s.date >= weekStr)
      const dailyAmounts = {}
      weekSales.forEach(s => {
        const day = s.date.split('T')[0]
        dailyAmounts[day] = (dailyAmounts[day] || 0) + (parseFloat(s.amount) || 0)
      })
      const weeklyDays = Object.keys(dailyAmounts).length

      const todayAmount = sales.filter(s => s.date === now.toISOString().split('T')[0])
        .reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
      const todayBonus = sales.filter(s => s.date === now.toISOString().split('T')[0])
        .reduce((sum, s) => sum + (parseInt(s.bonusItemCount) || 0), 0)

      const points = totalSales * 10 + Math.floor(totalAmount / 1000) * 5 + totalBonus * 2
      const currentLevel = [...LEVELS].reverse().find(l => points >= l.min) || LEVELS[0]
      const nextLevel = LEVELS.find(l => l.min > points)
      const progress = nextLevel ? ((points - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100 : 100

      const earnedBadges = BADGES.filter(b => b.check({ totalSales, maxSingleSale, quotaExceeded, weeklyDays, categoriesUsed }))

      const completedTasks = DAILY_TASKS.map(task => {
        let current = 0
        if (task.id === 'sale_5') current = todaySalesCount(sales)
        else if (task.id === 'amount_50k') current = todayAmount
        else if (task.id === 'bonus_3') current = todayBonus
        return { ...task, current: Math.min(current, task.target), completed: current >= task.target }
      })

      setStats({ totalSales, totalAmount, points, currentLevel, nextLevel, progress, earnedBadges, completedTasks, todayAmount, todayBonus })
    } catch (error) { console.error(error) } finally { setLoading(false) }
  }

  const todaySalesCount = (sales) => {
    const today = new Date().toISOString().split('T')[0]
    return sales.filter(s => s.date === today).length
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div>🔑 Giriş yapın</div></div>
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>🏆 Performansım</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Puanlarınızı, seviyenizi ve görevlerinizi takip edin</p>
      </div>

      {/* Seviye + Puan */}
      <div className="card" style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(109,40,217,0.1))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '48px' }}>{stats.currentLevel.icon}</div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: stats.currentLevel.color }}>{stats.currentLevel.name}</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc' }}>{stats.points} Puan</div>
            {stats.nextLevel && (
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{stats.nextLevel.icon} {stats.nextLevel.name}: {stats.nextLevel.min - stats.points} puan kaldı</div>
            )}
          </div>
        </div>
        {stats.nextLevel && (
          <div>
            <div style={{ height: '10px', backgroundColor: '#1e293b', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.progress}%`, background: `linear-gradient(90deg, ${stats.currentLevel.color}, ${stats.nextLevel.color})`, borderRadius: '5px', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '0.25rem' }}>
              <span>{stats.currentLevel.min}</span>
              <span>{stats.nextLevel.min}</span>
            </div>
          </div>
        )}
      </div>

      {/* Günlük Görevler */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>📋 Bugünkü Görevler</h3>
        <div className="space-y-2">
          {stats.completedTasks.map(task => (
            <div key={task.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
              backgroundColor: task.completed ? 'rgba(16,185,129,0.1)' : '#0f172a',
              borderRadius: '0.5rem', border: `1px solid ${task.completed ? '#10b981' : '#334155'}`
            }}>
              <span style={{ fontSize: '20px' }}>{task.completed ? '✅' : task.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: task.completed ? '#10b981' : '#f8fafc' }}>{task.name}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{task.current}/{task.target} • +{task.points} puan</div>
                <div style={{ height: '4px', backgroundColor: '#1e293b', borderRadius: '2px', marginTop: '0.25rem' }}>
                  <div style={{ height: '100%', width: `${(task.current / task.target) * 100}%`, backgroundColor: task.completed ? '#10b981' : '#8b5cf6', borderRadius: '2px' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rozetler */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>🏅 Kazanılan Rozetler ({stats.earnedBadges.length}/{BADGES.length})</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
          {BADGES.map(badge => {
            const earned = stats.earnedBadges.some(e => e.id === badge.id)
            return (
              <div key={badge.id} style={{
                padding: '0.875rem', borderRadius: '0.75rem', textAlign: 'center',
                backgroundColor: earned ? 'rgba(139,92,246,0.1)' : '#0f172a',
                border: `2px solid ${earned ? '#8b5cf6' : '#334155'}`,
                opacity: earned ? 1 : 0.4
              }}>
                <div style={{ fontSize: '28px', marginBottom: '0.375rem' }}>{badge.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: earned ? '#f8fafc' : '#64748b' }}>{badge.name}</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '0.15rem' }}>{badge.desc}</div>
                {earned && <div style={{ fontSize: '10px', color: '#10b981', marginTop: '0.25rem' }}>✅ Kazanıldı</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
