'use client'

import { AuthProvider } from '@/lib/auth-context'
import { useEffect } from 'react'
import LotteryCelebration from '@/components/LotteryCelebration'
import { ToastProvider } from '@/components/Toast'

export function Providers({ children }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Oturum zaman aşımı
    let timer
    const resetTimer = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (confirm('Oturumunuz 30 dakika hareketsiz kaldı. Çıkış yapılacak.')) {
          window.location.href = '/login'
        } else {
          resetTimer()
        }
      }, 30 * 60 * 1000)
    }
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(e => document.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimer))
      clearTimeout(timer)
    }
  }, [])

  return (
    <ToastProvider>
      <AuthProvider>
        {children}
        <LotteryCelebration />
      </AuthProvider>
    </ToastProvider>
  )
}
