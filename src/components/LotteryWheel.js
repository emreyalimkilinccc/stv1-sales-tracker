'use client'

import { useState, useEffect, useRef } from 'react'

const PARTICIPANTS = [
  { name: 'Emre YALIMKILINÇ', color: '#3b82f6' },
  { name: 'Derya DEMİR', color: '#8b5cf6' },
  { name: 'Sevim TEKİN', color: '#10b981' },
  { name: 'Onur VARAN', color: '#f59e0b' },
  { name: 'Merve KARAASLAN', color: '#ef4444' }
]

export default function LotteryWheel({ onWinner }) {
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const [currentName, setCurrentName] = useState('')
  const [showResult, setShowResult] = useState(false)
  const intervalRef = useRef(null)

  const playTickSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 800 + Math.random() * 400
      osc.type = 'sine'
      gain.gain.value = 0.1
      osc.start(); osc.stop(ctx.currentTime + 0.05)
    } catch (e) {}
  }

  const playWinSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const notes = [523, 659, 784, 1047]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.value = 0.15
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5 + i * 0.2)
        osc.start(ctx.currentTime + i * 0.15)
        osc.stop(ctx.currentTime + 0.5 + i * 0.15)
      })
    } catch (e) {}
  }

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setShowResult(false)
    setWinner(null)

    let speed = 50
    let count = 0
    const totalSpins = 40 + Math.floor(Math.random() * 20)

    const tick = () => {
      count++
      const idx = count % PARTICIPANTS.length
      setCurrentName(PARTICIPANTS[idx].name)
      playTickSound()

      if (count < totalSpins) {
        speed = 50 + (count / totalSpins) * 300
        intervalRef.current = setTimeout(tick, speed)
      } else {
        const winnerIdx = Math.floor(Math.random() * PARTICIPANTS.length)
        const winnerParticipant = PARTICIPANTS[winnerIdx]
        setCurrentName(winnerParticipant.name)
        setWinner(winnerParticipant)
        setSpinning(false)
        playWinSound()
        setTimeout(() => setShowResult(true), 500)
      }
    }
    tick()
  }

  useEffect(() => {
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current) }
  }, [])

  return (
    <div style={{ textAlign: 'center' }}>
      {/* Çark */}
      <div style={{
        width: '280px', height: '280px', margin: '0 auto 1.5rem',
        borderRadius: '50%', position: 'relative',
        background: `conic-gradient(${PARTICIPANTS.map((p, i) => `${p.color} ${(i * 100 / PARTICIPANTS.length)}% ${((i + 1) * 100 / PARTICIPANTS.length)}%`).join(', ')})`,
        boxShadow: spinning ? '0 0 40px rgba(59, 130, 246, 0.5)' : '0 0 20px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.3s ease'
      }}>
        {/* İsimler - Sabit Pozisyonda */}
        {PARTICIPANTS.map((p, i) => {
          const angle = (i * 360 / PARTICIPANTS.length) + (360 / PARTICIPANTS.length / 2)
          const rad = (angle * Math.PI) / 180
          const x = 140 + Math.cos(rad) * 90
          const y = 140 + Math.sin(rad) * 90
          return (
            <div key={p.name} style={{
              position: 'absolute',
              left: `${x}px`, top: `${y}px`,
              transform: 'translate(-50%, -50%)',
              fontSize: '10px', fontWeight: '700', color: '#fff',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap'
            }}>
              {p.name.split(' ')[0]}
            </div>
          )
        })}
        {/* Merkez */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60px', height: '60px', borderRadius: '50%',
          backgroundColor: '#0f172a', border: '3px solid #334155',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', zIndex: 2
        }}>
          {spinning ? '🎰' : winner ? '🏆' : '🎯'}
        </div>
        {/* Ok */}
        <div style={{
          position: 'absolute', top: '-8px', left: '50%',
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '12px solid transparent', borderRight: '12px solid transparent',
          borderTop: '20px solid #f8fafc',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          zIndex: 3
        }} />
      </div>

      {/* Dönen İsim */}
      <div style={{
        fontSize: '24px', fontWeight: '700', color: spinning ? '#f59e0b' : winner ? '#10b981' : '#f8fafc',
        marginBottom: '1.5rem', minHeight: '36px',
        animation: spinning ? 'pulse 0.1s infinite' : 'none'
      }}>
        {spinning ? currentName : winner ? `🏆 ${winner.name}` : '🎯 Çarkı Döndür'}
      </div>

      {/* Butonlar */}
      {!winner && (
        <button onClick={spin} disabled={spinning} style={{
          padding: '1rem 3rem', borderRadius: '9999px', fontSize: '18px', fontWeight: '700',
          background: spinning ? 'linear-gradient(135deg, #64748b, #475569)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
          color: '#fff', border: 'none', cursor: spinning ? 'not-allowed' : 'pointer',
          boxShadow: spinning ? 'none' : '0 4px 20px rgba(139, 92, 246, 0.4)',
          transition: 'all 0.3s ease'
        }}>
          {spinning ? '⏳ Dönüyor...' : '🎰 Çarkı Döndür'}
        </button>
      )}

      {/* Sonuç */}
      {showResult && winner && (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          <div style={{ fontSize: '48px', marginBottom: '0.5rem' }}>🎉</div>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '1rem' }}>Kazanan kişi</div>
          <button onClick={() => onWinner(winner)} style={{
            padding: '1rem 2.5rem', borderRadius: '9999px', fontSize: '16px', fontWeight: '700',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff', border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
          }}>
            🏆 Kazananı İlan Et
          </button>
        </div>
      )}
    </div>
  )
}
