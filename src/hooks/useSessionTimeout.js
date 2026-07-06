'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 dakika

export function useSessionTimeout() {
  const { signOut } = useAuth()
  const timerRef = useRef(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (confirm('Oturumunuz 30 dakika süreyle hareketsiz kaldı. Çıkış yapılacak.')) {
        signOut()
      } else {
        resetTimer()
      }
    }, TIMEOUT_MS)
  }, [signOut])

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetTimer])
}
