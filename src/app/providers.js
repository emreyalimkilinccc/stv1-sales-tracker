'use client'

import { AuthProvider, useAuth } from '@/lib/auth-context'
import { useEffect } from 'react'
import LotteryCelebration from '@/components/LotteryCelebration'
import { ToastProvider } from '@/components/Toast'
import { useSessionTimeout } from '@/hooks/useSessionTimeout'

function SessionWrapper({ children }) {
  const { user } = useAuth()
  useSessionTimeout()
  return <>{children}</>
}

export function Providers({ children }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return (
    <ToastProvider>
      <AuthProvider>
        <SessionWrapper>
          {children}
          <LotteryCelebration />
        </SessionWrapper>
      </AuthProvider>
    </ToastProvider>
  )
}
