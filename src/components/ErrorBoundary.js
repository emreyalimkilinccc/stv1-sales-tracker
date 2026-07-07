'use client'

import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#0f172a', padding: '2rem'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '48px', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>Bir hata oluştu</h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '1rem' }}>{this.state.error?.message || 'Sayfa yüklenirken bir sorun oluştu'}</p>
            <button onClick={() => window.location.reload()} style={{
              padding: '0.75rem 1.5rem', borderRadius: '0.75rem', backgroundColor: '#3b82f6',
              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600'
            }}>🔄 Sayfayı Yenile</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
