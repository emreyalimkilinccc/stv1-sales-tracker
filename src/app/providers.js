'use client'

import { AuthProvider } from '@/lib/auth-context'
import { useEffect } from 'react'
import LotteryCelebration from '@/components/LotteryCelebration'

export function Providers({ children }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return (
    <AuthProvider>
      {children}
      <LotteryCelebration />
    </AuthProvider>
  )
}
