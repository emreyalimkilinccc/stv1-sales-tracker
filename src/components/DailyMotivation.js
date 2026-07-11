'use client'

import { useState, useEffect } from 'react'

const MOTIVATIONS = [
  { text: 'Bugün en iyi satışını yap! 🌟', author: 'STV1' },
  { text: 'Her yeni satış, yeni bir başarıdır! 🏆', author: 'STV1' },
  { text: 'Küçük adımlar büyük başarılara yol açar! 🚀', author: 'STV1' },
  { text: 'Müşterilerine gülümse, satışlar artsın! 😊', author: 'STV1' },
  { text: 'Bugün de harika işler başaracaksın! 💪', author: 'STV1' },
  { text: 'En iyi satış senin satışın! 🥇', author: 'STV1' },
  { text: 'Kendine güven, başarı seninle! ✨', author: 'STV1' },
  { text: 'Her müşteriye değer ver, satışlar artsın! 💎', author: 'STV1' },
  { text: 'Bugün bir hedef koy ve onu aş! 🎯', author: 'STV1' },
  { text: 'Başarı, çaba gösterenlerin kapısını çalar! 🚪', author: 'STV1' },
  { text: 'Küçük başarılar büyük zaferlere dönüşür! 🌈', author: 'STV1' },
  { text: 'Bugün de en iyi sen ol! 🌟', author: 'STV1' },
  { text: 'Her satış bir adım daha ileriye! 📈', author: 'STV1' },
  { text: 'Müşterilerinle güven oluştur, satışlar gelir! 🤝', author: 'STV1' },
  { text: 'Bugün özel bir gün, en iyi satışı sen yap! 🎉', author: 'STV1' },
  { text: 'Zorluklar seni güçlü yapar, devam et! 💪', author: 'STV1' },
  { text: 'Başarının sırrı sabır ve çabadır! 🌱', author: 'STV1' },
  { text: 'Bugün de harika işler başaracaksın! 🌈', author: 'STV1' },
  { text: 'En çok satış yapan sen olabilirsin! 🏆', author: 'STV1' },
  { text: 'Müşterilerine değer kattıkça satışlar artsın! 💎', author: 'STV1' },
  { text: 'Bugün bir hedef koy ve onu aş! 🎯', author: 'STV1' },
  { text: 'Başarı senin kapını çalacak! 🚪', author: 'STV1' },
  { text: 'Her adım seni zirveye taşıyacak! 🏔️', author: 'STV1' },
  { text: 'Bugün de en iyi satışını yap! 🌟', author: 'STV1' },
  { text: 'Kendine güven, başarı seninle! ✨', author: 'STV1' },
  { text: 'Müşterilerine gülümse, satışlar artsın! 😊', author: 'STV1' },
  { text: 'Her yeni satış yeni bir başlangıçtır! 🚀', author: 'STV1' },
  { text: 'En iyi satış senin satışın! 🥇', author: 'STV1' },
  { text: 'Bugün de harika işler başaracaksın! 💪', author: 'STV1' },
  { text: 'Başarı seninle, devam et! 🌟', author: 'STV1' }
]

export default function DailyMotivation() {
  const [show, setShow] = useState(false)
  const [motivation, setMotivation] = useState(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const seen = localStorage.getItem(`motivation-${today}`)
    if (!seen) {
      const idx = Math.floor(Math.random() * MOTIVATIONS.length)
      setMotivation(MOTIVATIONS[idx])
      setShow(true)
      localStorage.setItem(`motivation-${today}`, '1')
    }
  }, [])

  if (!show || !motivation) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1))',
      border: '2px solid rgba(139, 92, 246, 0.3)', borderRadius: '1rem',
      padding: '1.25rem', marginBottom: '1rem',
      animation: 'fadeIn 0.5s ease', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '60px', opacity: 0.08, transform: 'rotate(15deg)' }}>✨</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <span style={{ fontSize: '28px', flexShrink: 0 }}>💬</span>
        <div>
          <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: '600', marginBottom: '0.375rem', letterSpacing: '1px', textTransform: 'uppercase' }}>Bugünün Motivasyonu</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', lineHeight: '1.5' }}>{motivation.text}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '0.375rem' }}>— {motivation.author}</div>
        </div>
        <button onClick={() => setShow(false)} style={{
          background: 'none', border: 'none', color: '#64748b', fontSize: '18px', cursor: 'pointer', flexShrink: 0
        }}>✕</button>
      </div>
    </div>
  )
}
