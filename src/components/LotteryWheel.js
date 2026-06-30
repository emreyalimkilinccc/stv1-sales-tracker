'use client'

import { useState, useEffect, useRef } from 'react'

const PARTICIPANTS = [
  { name: 'Emre YALIMKILINÇ', color: '#3b82f6', emoji: '👤' },
  { name: 'Derya DEMİR', color: '#8b5cf6', emoji: '👩' },
  { name: 'Sevim TEKİN', color: '#10b981', emoji: '👩' },
  { name: 'Onur VARAN', color: '#f59e0b', emoji: '👤' },
  { name: 'Merve KARAASLAN', color: '#ef4444', emoji: '👩' }
]

export default function LotteryWheel({ onWinner }) {
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [showResult, setShowResult] = useState(false)
  const [rotation, setRotation] = useState(0)
  const intervalRef = useRef(null)

  const playTickSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 600 + Math.random() * 600
      osc.type = 'triangle'
      gain.gain.value = 0.08
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
      osc.start(); osc.stop(ctx.currentTime + 0.08)
    } catch (e) {}
  }

  const playWinSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const melody = [523, 659, 784, 1047, 1319]
      melody.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.value = 0.2
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8 + i * 0.15)
        osc.start(ctx.currentTime + i * 0.12)
        osc.stop(ctx.currentTime + 0.8 + i * 0.15)
      })
    } catch (e) {}
  }

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setShowResult(false)
    setWinner(null)

    let speed = 40
    let count = 0
    const totalSpins = 50 + Math.floor(Math.random() * 25)
    const winnerIdx = Math.floor(Math.random() * PARTICIPANTS.length)
    const segmentAngle = 360 / PARTICIPANTS.length
    const targetRotation = 360 * 8 + (360 - winnerIdx * segmentAngle - segmentAngle / 2)

    const tick = () => {
      count++
      const idx = count % PARTICIPANTS.length
      setCurrentIdx(idx)
      playTickSound()

      if (count < totalSpins) {
        const progress = count / totalSpins
        speed = 40 + progress * progress * 400
        const currentRot = (count / totalSpins) * targetRotation
        setRotation(currentRot)
        intervalRef.current = setTimeout(tick, speed)
      } else {
        setRotation(targetRotation)
        setCurrentIdx(winnerIdx)
        setWinner(PARTICIPANTS[winnerIdx])
        setSpinning(false)
        playWinSound()
        setTimeout(() => setShowResult(true), 600)
      }
    }
    tick()
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current) }
  }, [])

  const segmentAngle = 360 / PARTICIPANTS.length

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Glow Arka Plan */}
      <div style={{
        width: '340px', height: '340px', margin: '0 auto 2rem',
        borderRadius: '50%', position: 'relative',
        background: spinning
          ? 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)'
          : winner
            ? 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
        transition: 'background 0.5s ease'
      }}>
        {/* Dış Halka */}
        <div style={{
          position: 'absolute', top: '15px', left: '15px', right: '15px', bottom: '15px',
          borderRadius: '50%', border: '3px solid #334155',
          boxShadow: spinning ? '0 0 30px rgba(139, 92, 246, 0.3), inset 0 0 30px rgba(139, 92, 246, 0.1)' : '0 0 15px rgba(0,0,0,0.2)',
          transition: 'box-shadow 0.5s ease'
        }} />

        {/* Çark */}
        <div style={{
          position: 'absolute', top: '25px', left: '25px', right: '25px', bottom: '25px',
          borderRadius: '50%', overflow: 'hidden',
          background: `conic-gradient(from 0deg, ${PARTICIPANTS.map((p, i) => `${p.color}dd ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`).join(', ')})`,
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'none' : 'transform 0.1s ease-out',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          {/* Bölüm Çizgileri */}
          {PARTICIPANTS.map((_, i) => (
            <div key={i} style={{
              position: 'absolute', top: '50%', left: '50%',
              width: '50%', height: '2px', backgroundColor: 'rgba(255,255,255,0.3)',
              transformOrigin: '0 50%',
              transform: `rotate(${i * segmentAngle}deg)`
            }} />
          ))}
          {/* İsimler */}
          {PARTICIPANTS.map((p, i) => {
            const angle = i * segmentAngle + segmentAngle / 2
            const rad = (angle * Math.PI) / 180
            const radius = 48
            const x = 50 + Math.cos(rad) * radius
            const y = 50 + Math.sin(rad) * radius
            return (
              <div key={p.name} style={{
                position: 'absolute', left: `${x}%`, top: `${y}%`,
                transform: `translate(-50%, -50%) rotate(${-rotation + angle}deg)`,
                fontSize: '10px', fontWeight: '800', color: '#fff',
                textShadow: '0 1px 4px rgba(0,0,0,0.9)', whiteSpace: 'nowrap',
                letterSpacing: '0.5px'
              }}>
                {p.name.split(' ')[0]}
              </div>
            )
          })}
        </div>

        {/* Merkez */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '72px', height: '72px', borderRadius: '50%',
          backgroundColor: '#0f172a',
          border: spinning ? '3px solid #8b5cf6' : winner ? '3px solid #10b981' : '3px solid #475569',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px', zIndex: 5,
          boxShadow: spinning ? '0 0 20px rgba(139,92,246,0.4)' : winner ? '0 0 20px rgba(16,185,129,0.4)' : '0 0 10px rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease'
        }}>
          {spinning ? '🎰' : winner ? '🏆' : '🎯'}
        </div>

        {/* Ok İşareti */}
        <div style={{
          position: 'absolute', top: '8px', left: '50%',
          transform: 'translateX(-50%)', zIndex: 10,
          width: 0, height: 0,
          borderLeft: '14px solid transparent', borderRight: '14px solid transparent',
          borderTop: '24px solid #f8fafc',
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))'
        }} />
      </div>

      {/* Dönen İsim Göstergesi */}
      <div style={{
        padding: '1rem 2rem', borderRadius: '1rem', marginBottom: '1.5rem',
        backgroundColor: spinning ? '#1e293b' : winner ? 'rgba(16, 185, 129, 0.1)' : '#1e293b',
        border: `2px solid ${spinning ? '#8b5cf6' : winner ? '#10b981' : '#334155'}`,
        transition: 'all 0.3s ease',
        minHeight: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        {spinning && currentIdx >= 0 && (
          <>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '0.25rem' }}>Şu anki isim</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: PARTICIPANTS[currentIdx]?.color || '#f8fafc', letterSpacing: '1px' }}>
              {PARTICIPANTS[currentIdx]?.name}
            </div>
          </>
        )}
        {winner && !spinning && (
          <>
            <div style={{ fontSize: '13px', color: '#10b981', marginBottom: '0.375rem', fontWeight: '600' }}>🏆 TEBRİKLER!</div>
            <div style={{ fontSize: '26px', fontWeight: '800', color: winner.color, letterSpacing: '1px' }}>{winner.name}</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.25rem' }}>Bugünün şanslı kişisi</div>
          </>
        )}
        {!spinning && !winner && (
          <>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>🎯 Çarkı döndürmeye hazır mısın?</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '0.25rem' }}>5 katılımcı arasında 1 şanslı kişi</div>
          </>
        )}
      </div>

      {/* Butonlar */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {!winner && (
          <button onClick={spin} disabled={spinning} style={{
            padding: '1rem 3rem', borderRadius: '9999px', fontSize: '17px', fontWeight: '700',
            background: spinning
              ? 'linear-gradient(135deg, #475569, #334155)'
              : 'linear-gradient(135deg, #8b5cf6, #6d28d9, #7c3aed)',
            color: '#fff', border: 'none', cursor: spinning ? 'not-allowed' : 'pointer',
            boxShadow: spinning ? 'none' : '0 4px 25px rgba(139, 92, 246, 0.5)',
            transition: 'all 0.3s ease',
            letterSpacing: '0.5px',
            animation: !spinning ? 'pulse 2s infinite' : 'none'
          }}>
            {spinning ? '⏳ Dönüyor...' : '🎰 Çarkı Döndür'}
          </button>
        )}
      </div>

      {/* Sonuç Butonu */}
      {showResult && winner && (
        <div style={{
          marginTop: '1.5rem', padding: '1.5rem', borderRadius: '1rem',
          backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '2px solid rgba(16, 185, 129, 0.3)',
          animation: 'fadeIn 0.5s ease'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '0.5rem' }}>🎉🎆🎇</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '1rem' }}>Kazanan kişiyi ilan etmek için tıklayın</div>
          <button onClick={() => onWinner(winner)} style={{
            padding: '1rem 3rem', borderRadius: '9999px', fontSize: '17px', fontWeight: '700',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff', border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 25px rgba(16, 185, 129, 0.5)',
            letterSpacing: '0.5px'
          }}>
            🏆 Kazananı İlan Et
          </button>
        </div>
      )}
    </div>
  )
}
