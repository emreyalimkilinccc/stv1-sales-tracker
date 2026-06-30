'use client'

import { useEffect, useRef } from 'react'

export default function Celebration({ active }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    if (!active || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles = []
    const fireworks = []
    const colors = ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0077ff', '#ff00ff', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6']

    class Particle {
      constructor(x, y, color, type) {
        this.x = x
        this.y = y
        this.color = color
        this.type = type
        this.size = type === 'confetti' ? 4 + Math.random() * 4 : 2 + Math.random() * 3
        this.speedX = (Math.random() - 0.5) * (type === 'firework' ? 6 : 3)
        this.speedY = type === 'firework' ? (Math.random() - 0.5) * 6 : (type === 'confetti' ? 2 + Math.random() * 4 : -3 - Math.random() * 5)
        this.gravity = type === 'confetti' ? 0.05 : type === 'firework' ? 0.05 : 0.02
        this.opacity = 1
        this.decay = type === 'firework' ? 0.015 : type === 'confetti' ? 0.003 : 0.02
        this.rotation = Math.random() * Math.PI * 2
        this.rotSpeed = (Math.random() - 0.5) * 0.1
        this.width = type === 'confetti' ? 6 + Math.random() * 4 : this.size
        this.height = type === 'confetti' ? 3 + Math.random() * 2 : this.size
      }
      update() {
        this.x += this.speedX
        this.y += this.speedY
        this.speedY += this.gravity
        this.opacity -= this.decay
        this.rotation += this.rotSpeed
        if (this.type === 'firework') {
          this.speedX *= 0.98
          this.speedY *= 0.98
        }
      }
      draw() {
        ctx.save()
        ctx.globalAlpha = Math.max(0, this.opacity)
        ctx.translate(this.x, this.y)
        ctx.rotate(this.rotation)
        if (this.type === 'confetti') {
          ctx.fillStyle = this.color
          ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, this.size, 0, Math.PI * 2)
          ctx.fillStyle = this.color
          ctx.fill()
        }
        ctx.restore()
      }
    }

    const launchFirework = () => {
      const x = Math.random() * canvas.width
      const y = canvas.height * 0.3 + Math.random() * canvas.height * 0.4
      const color = colors[Math.floor(Math.random() * colors.length)]
      for (let i = 0; i < 50; i++) {
        particles.push(new Particle(x, y, color, 'firework'))
      }
    }

    const spawnConfetti = () => {
      for (let i = 0; i < 3; i++) {
        particles.push(new Particle(Math.random() * canvas.width, -10, colors[Math.floor(Math.random() * colors.length)], 'confetti'))
      }
    }

    let lastFirework = 0
    let lastConfetti = 0

    const animate = (timestamp) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (timestamp - lastFirework > 800 + Math.random() * 1500) {
        launchFirework()
        lastFirework = timestamp
      }

      if (timestamp - lastConfetti > 100) {
        spawnConfetti()
        lastConfetti = timestamp
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update()
        particles[i].draw()
        if (particles[i].opacity <= 0) particles.splice(i, 1)
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [active])

  if (!active) return null

  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 9999
    }} />
  )
}
