'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const FALLBACK_PARTICIPANTS = [
  { name: 'Emre YALIMKILINÇ', color: '#3b82f6' },
  { name: 'Derya DEMİR', color: '#8b5cf6' },
  { name: 'Sevim TEKİN', color: '#10b981' },
  { name: 'Onur VARAN', color: '#f59e0b' },
  { name: 'Merve KARAASLAN', color: '#ef4444' }
]

export default function LotteryWheel({ onWinner, participants: propParticipants }) {
  const PARTICIPANTS = propParticipants && propParticipants.length > 0 ? propParticipants : FALLBACK_PARTICIPANTS
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const audioCtxRef = useRef(null)
  const tickCountRef = useRef(0)
  const tickTimerRef = useRef(null)

  const segmentAngle = 360 / PARTICIPANTS.length

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioCtxRef.current
  }, [])

  const playTick = useCallback(() => {
    try {
      const ctx = getAudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 900 + Math.random() * 300
      osc.type = 'triangle'
      gain.gain.value = 0.08
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
      osc.start(); osc.stop(ctx.currentTime + 0.06)
    } catch (e) {}
  }, [getAudioCtx])

  const playWin = useCallback(() => {
    try {
      const ctx = getAudioCtx()
      const melody = [523, 659, 784, 1047, 1319, 1568]
      melody.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.value = 0.15
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6 + i * 0.12)
        osc.start(ctx.currentTime + i * 0.1)
        osc.stop(ctx.currentTime + 0.6 + i * 0.12)
      })
    } catch (e) {}
  }, [getAudioCtx])

  const spin = useCallback(() => {
    if (spinning || PARTICIPANTS.length < 2) return
    setSpinning(true)
    setShowResult(false)
    setWinner(null)
    setHighlightIdx(-1)

    const winnerIdx = Math.floor(Math.random() * PARTICIPANTS.length)
    const targetAngle = winnerIdx * segmentAngle

    const totalRotation = 360 * 10 + (360 - targetAngle - segmentAngle / 2)
    const startRotation = rotation % 360
    const finalRotation = rotation + totalRotation - startRotation + (360 - startRotation)

    setRotation(finalRotation)

    const duration = 5000
    const startTime = Date.now()
    tickCountRef.current = 0

    const tickInterval = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      const currentAngle = (finalRotation - rotation) * eased
      const currentIdx = Math.floor(((360 - (currentAngle % 360)) % 360) / segmentAngle) % PARTICIPANTS.length
      setHighlightIdx(currentIdx)

      const prevTick = Math.floor(progress * 30)
      if (prevTick > tickCountRef.current) {
        tickCountRef.current = prevTick
        playTick()
      }

      if (progress < 1) {
        tickTimerRef.current = requestAnimationFrame(tickInterval)
      } else {
        setHighlightIdx(winnerIdx)
        setWinner(PARTICIPANTS[winnerIdx])
        setSpinning(false)
        playWin()
        setTimeout(() => setShowResult(true), 600)
      }
    }

    tickTimerRef.current = requestAnimationFrame(tickInterval)
  }, [spinning, PARTICIPANTS, segmentAngle, rotation, playTick, playWin])

  useEffect(() => {
    return () => { if (tickTimerRef.current) cancelAnimationFrame(tickTimerRef.current) }
  }, [])

  useEffect(() => {
    setWinner(null)
    setShowResult(false)
    setHighlightIdx(-1)
  }, [propParticipants])

  const SIZE = 300
  const CENTER = SIZE / 2
  const WHEEL_R = SIZE / 2 - 5
  const NAME_R = WHEEL_R * 0.65

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: `${SIZE}px`, height: `${SIZE + 20}px`, margin: '0 auto 1.5rem' }}>
        {/* Ok - sabit üstte */}
        <div style={{
          position: 'absolute', top: 0, left: '50%',
          transform: 'translateX(-50%)', zIndex: 10,
          width: 0, height: 0,
          borderLeft: '14px solid transparent', borderRight: '14px solid transparent',
          borderTop: '26px solid #f59e0b',
          filter: 'drop-shadow(0 2px 6px rgba(245, 158, 11, 0.5))'
        }} />

        {/* Dönen Çark */}
        <div style={{
          width: `${SIZE}px`, height: `${SIZE}px`,
          borderRadius: '50%', position: 'relative',
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? 'none' : 'transform 0.1s ease-out',
          willChange: 'transform'
        }}>
          {/* Renkli dilimler */}
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ position: 'absolute', top: 0, left: 0 }}>
            {PARTICIPANTS.map((p, i) => {
              const startAngle = (i * segmentAngle - 90) * (Math.PI / 180)
              const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180)
              const x1 = CENTER + WHEEL_R * Math.cos(startAngle)
              const y1 = CENTER + WHEEL_R * Math.sin(startAngle)
              const x2 = CENTER + WHEEL_R * Math.cos(endAngle)
              const y2 = CENTER + WHEEL_R * Math.sin(endAngle)
              const largeArc = segmentAngle > 180 ? 1 : 0
              return (
                <g key={i}>
                  <path
                    d={`M ${CENTER} ${CENTER} L ${x1} ${y1} A ${WHEEL_R} ${WHEEL_R} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={p.color}
                    stroke="#0f172a"
                    strokeWidth="2"
                  />
                  {/* Çizgi */}
                  <line x1={CENTER} y1={CENTER} x2={x2} y2={y2} stroke="#0f172a" strokeWidth="2" opacity="0.5" />
                </g>
              )
            })}
          </svg>

          {/* İsimler - çarkla birlikte döner */}
          {PARTICIPANTS.map((p, i) => {
            const angle = (i * segmentAngle + segmentAngle / 2 - 90) * (Math.PI / 180)
            const x = CENTER + NAME_R * Math.cos(angle)
            const y = CENTER + NAME_R * Math.sin(angle)
            const textAngle = i * segmentAngle + segmentAngle / 2
            return (
              <div key={p.name + i} style={{
                position: 'absolute',
                left: `${x}px`, top: `${y}px`,
                transform: `translate(-50%, -50%) rotate(${textAngle}deg)`,
                fontSize: PARTICIPANTS.length > 6 ? '9px' : '11px',
                fontWeight: '800', color: '#fff',
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                whiteSpace: 'nowrap', letterSpacing: '0.3px'
              }}>
                {p.name.split(' ')[0]}
              </div>
            )
          })}
        </div>

        {/* Merkez daire - sabit */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '56px', height: '56px', borderRadius: '50%',
          backgroundColor: '#0f172a', border: '3px solid #475569',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', zIndex: 5,
          boxShadow: spinning ? '0 0 25px rgba(139,92,246,0.4)' : winner ? '0 0 25px rgba(16,185,129,0.4)' : '0 0 10px rgba(0,0,0,0.3)',
          transition: 'box-shadow 0.3s ease'
        }}>
          {spinning ? '🎰' : winner ? '🏆' : '🎯'}
        </div>
      </div>

      {/* Seçilen İsim */}
      <div style={{
        fontSize: '24px', fontWeight: '700',
        color: spinning ? '#f59e0b' : winner ? '#10b981' : '#f8fafc',
        marginBottom: '1.5rem', minHeight: '36px',
        transition: 'color 0.3s ease'
      }}>
        {spinning && highlightIdx >= 0 ? (
          <span style={{ color: PARTICIPANTS[highlightIdx]?.color || '#f59e0b' }}>
            {PARTICIPANTS[highlightIdx]?.name}
          </span>
        ) : winner ? (
          `🏆 ${winner.name}`
        ) : PARTICIPANTS.length < 2 ? (
          '⚠️ En az 2 katılımcı gerekli'
        ) : (
          '🎯 Çarkı Döndür'
        )}
      </div>

      {/* Buton */}
      {!winner && (
        <button onClick={spin} disabled={spinning || PARTICIPANTS.length < 2} style={{
          padding: '1rem 3rem', borderRadius: '9999px', fontSize: '18px', fontWeight: '700',
          background: spinning || PARTICIPANTS.length < 2
            ? 'linear-gradient(135deg, #475569, #334155)'
            : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
          color: '#fff', border: 'none',
          cursor: spinning || PARTICIPANTS.length < 2 ? 'not-allowed' : 'pointer',
          boxShadow: spinning ? 'none' : '0 4px 20px rgba(139, 92, 246, 0.4)',
          transition: 'all 0.3s ease'
        }}>
          {spinning ? '⏳ Dönüyor...' : '🎰 Çarkı Döndür'}
        </button>
      )}

      {/* Sonuç */}
      {showResult && winner && (
        <div style={{ animation: 'fadeIn 0.5s ease', marginTop: '1rem' }}>
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
