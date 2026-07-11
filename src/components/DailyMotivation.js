'use client'

import { useState, useEffect } from 'react'

const MOTIVATIONS = [
  { text: 'Bugün en iyi satışını yap! 🌟', color: '#f59e0b' },
  { text: 'Her yeni satış, yeni bir başarıdır! 🏆', color: '#10b981' },
  { text: 'Küçük adımlar büyük başarılara yol açar! 🚀', color: '#3b82f6' },
  { text: 'Müşterilerine gülümse, satışlar artsın! 😊', color: '#8b5cf6' },
  { text: 'Bugün de harika işler başaracaksın! 💪', color: '#ef4444' },
  { text: 'En iyi satış senin satışın! 🥇', color: '#f59e0b' },
  { text: 'Kendine güven, başarı seninle! ✨', color: '#06b6d4' },
  { text: 'Her müşteriye değer ver, satışlar artsın! 💎', color: '#ec4899' },
  { text: 'Bugün bir hedef koy ve onu aş! 🎯', color: '#8b5cf6' },
  { text: 'Başarı, çaba gösterenlerin kapısını çalar! 🚪', color: '#10b981' },
  { text: 'Küçük başarılar büyük zaferlere dönüşür! 🌈', color: '#3b82f6' },
  { text: 'Bugün de en iyi sen ol! 🌟', color: '#f59e0b' },
  { text: 'Her satış bir adım daha ileriye! 📈', color: '#8b5cf6' },
  { text: 'Müşterilerinle güven oluştur, satışlar gelir! 🤝', color: '#06b6d4' },
  { text: 'Bugün özel bir gün, en iyi satışı sen yap! 🎉', color: '#ef4444' },
  { text: 'Zorluklar seni güçlü yapar, devam et! 💪', color: '#10b981' },
  { text: 'Başarının sırrı sabır ve çabadır! 🌱', color: '#8b5cf6' },
  { text: 'Bugün de harika işler başaracaksın! 🌈', color: '#f59e0b' },
  { text: 'En çok satış yapan sen olabilirsin! 🏆', color: '#3b82f6' },
  { text: 'Müşterilerine değer kattıkça satışlar artsın! 💎', color: '#06b6d4' },
  { text: 'Bugün bir hedef koy ve onu aş! 🎯', color: '#ef4444' },
  { text: 'Başarı senin kapını çalacak! 🚪', color: '#10b981' },
  { text: 'Her adım seni zirveye taşıyacak! 🏔️', color: '#8b5cf6' },
  { text: 'Bugün de en iyi satışını yap! 🌟', color: '#f59e0b' },
  { text: 'Kendine güven, başarı seninle! ✨', color: '#3b82f6' },
  { text: 'Müşterilerine gülümse, satışlar artsın! 😊', color: '#ec4899' },
  { text: 'Her yeni satış yeni bir başlangıçtır! 🚀', color: '#06b6d4' },
  { text: 'En iyi satış senin satışın! 🥇', color: '#f59e0b' },
  { text: 'Bugün de harika işler başaracaksın! 💪', color: '#10b981' },
  { text: 'Başarı seninle, devam et! 🌟', color: '#8b5cf6' }
]

export default function DailyMotivation() {
  const [motivation, setMotivation] = useState(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const idx = parseInt(today.replace(/-/g, '')) % MOTIVATIONS.length
    setMotivation(MOTIVATIONS[idx])
  }, [])

  if (!motivation) return null

  return (
    <div style={{
      background: `linear-gradient(135deg, ${motivation.color}15, ${motivation.color}08)`,
      border: `2px solid ${motivation.color}40`, borderRadius: '1rem',
      padding: '1.5rem 2rem', marginBottom: '1.5rem',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '100px', opacity: 0.06, transform: 'rotate(15deg)' }}>✨</div>
      <div style={{ position: 'absolute', bottom: '-15px', left: '-15px', fontSize: '80px', opacity: 0.05, transform: 'rotate(-15deg)' }}>🌟</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '40px', flexShrink: 0 }}>💬</span>
        <div>
          <div style={{ fontSize: '13px', color: motivation.color, fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '2px', textTransform: 'uppercase' }}>✨ Bugünün Motivasyonu</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc', lineHeight: '1.4' }}>{motivation.text}</div>
        </div>
      </div>
    </div>
  )
}
