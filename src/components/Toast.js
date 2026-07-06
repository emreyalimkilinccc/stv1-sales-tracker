'use client'

import { useState, useCallback, createContext, useContext } from 'react'

const ToastContext = createContext()

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning')
  }

  const typeStyles = {
    success: { bg: 'rgba(16, 185, 129, 0.95)', icon: '✅', border: '#10b981' },
    error: { bg: 'rgba(239, 68, 68, 0.95)', icon: '❌', border: '#ef4444' },
    info: { bg: 'rgba(59, 130, 246, 0.95)', icon: 'ℹ️', border: '#3b82f6' },
    warning: { bg: 'rgba(245, 158, 11, 0.95)', icon: '⚠️', border: '#f59e0b' }
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '380px' }}>
        {toasts.map(t => {
          const s = typeStyles[t.type] || typeStyles.info
          return (
            <div key={t.id} style={{
              backgroundColor: s.bg, color: '#fff', padding: '0.875rem 1.25rem',
              borderRadius: '0.75rem', boxShadow: `0 4px 20px ${s.border}40`,
              fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem',
              animation: 'toastIn 0.3s ease', backdropFilter: 'blur(8px)',
              border: `1px solid ${s.border}60`
            }}>
              <span style={{ fontSize: '18px' }}>{s.icon}</span> {t.message}
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes toastIn { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </ToastContext.Provider>
  )
}
