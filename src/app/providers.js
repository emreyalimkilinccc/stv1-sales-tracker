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
