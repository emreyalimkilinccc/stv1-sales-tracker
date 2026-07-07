'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/Toast'

export default function BarkodPage() {
  const { user, loading: authLoading } = useAuth()
  const toast = useToast()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [manualCode, setManualCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [recentScans, setRecentScans] = useState([])
  const [inventoryMatch, setInventoryMatch] = useState(null)
  const [salesMatch, setSalesMatch] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [cameraDevices, setCameraDevices] = useState([])
  const [selectedDevice, setSelectedDevice] = useState('')

  useEffect(() => {
    fetchRecentScans()
    getCameraDevices()
    return () => stopCamera()
  }, [])

  if (authLoading) return <div className="px-4 py-6 max-w-7xl mx-auto"><div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>⏳ Yükleniyor...</div></div>
  if (!user) return <div className="px-4 py-6 max-w-7xl mx-auto"><div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>🔑 Lütfen giriş yapın</div></div>

  const getCameraDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(d => d.kind === 'videoinput')
      setCameraDevices(cameras)
      if (cameras.length > 0) setSelectedDevice(cameras[0].deviceId)
    } catch (e) { setCameraError('Kamera erişimi engellendi') }
  }

  const startCamera = async () => {
    setCameraError('')
    setScanning(true)
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          ...(selectedDevice ? { deviceId: { exact: selectedDevice } } : {})
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      // Simulated barcode detection loop using BarcodeDetector API if available
      if ('BarcodeDetector' in window) {
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'] })
        const detectLoop = async () => {
          if (!streamRef.current || !videoRef.current) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              handleBarcodeDetected(barcodes[0].rawValue)
              return
            }
          } catch (e) {}
          if (streamRef.current) requestAnimationFrame(detectLoop)
        }
        requestAnimationFrame(detectLoop)
      }
    } catch (error) {
      setCameraError('Kamera başlatılamadı: ' + error.message)
      setScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  const handleBarcodeDetected = async (code) => {
    stopCamera()
    setScanResult(code)
    await lookupCode(code)
  }

  const handleManualSubmit = async (e) => {
    e.preventDefault()
    if (!manualCode.trim()) { toast.warning('Barkod numarası girin!'); return }
    await lookupCode(manualCode.trim())
    setManualCode('')
  }

  const lookupCode = async (code) => {
    setSearchLoading(true)
    setInventoryMatch(null)
    setSalesMatch(null)
    try {
      // Search inventory by SKU
      const invQ = query(collection(db, 'inventory'), where('sku', '==', code))
      const invSnap = await getDocs(invQ)
      if (!invSnap.empty) {
        const item = { id: invSnap.docs[0].id, ...invSnap.docs[0].data() }
        setInventoryMatch(item)
      }

      // Search sales by customer phone (barcode might be a phone)
      const salesQ = query(collection(db, 'sales'), where('customerPhone', '==', code))
      const salesSnap = await getDocs(salesQ)
      if (!salesSnap.empty) {
        setSalesMatch(salesSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      }

      // Save to recent scans
      await addDoc(collection(db, 'barcodeScans'), {
        code,
        scannedBy: user.uid,
        scannedByName: user.name || user.email,
        storeId: user.storeId || null,
        foundInventory: !invSnap.empty,
        foundSales: !salesSnap.empty,
        scannedAt: new Date().toISOString()
      })
      fetchRecentScans()

      if (invSnap.empty && salesSnap.empty) {
        toast.warning(`"${code}" için eşleşme bulunamadı`)
      } else {
        toast.success(`"${code}" barkodu tarandı`)
      }
    } catch (error) {
      toast.error('Arama hatası: ' + error.message)
    } finally { setSearchLoading(false) }
  }

  const fetchRecentScans = async () => {
    try {
      const q = query(collection(db, 'barcodeScans'))
      const snapshot = await getDocs(q)
      setRecentScans(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) { console.error(error) }
  }

  const totalSalesAmount = salesMatch ? salesMatch.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0) : 0

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>📱 Barkod Tarama</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Kamera ile barkod tarama veya manuel giriş</p>
      </div>

      {/* Camera Section */}
      <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📷 Kamera Tarama</h3>
        {cameraError && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.75rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '13px', color: '#fca5a5' }}>
            ⚠️ {cameraError}
          </div>
        )}
        {cameraDevices.length > 1 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>🎥 Kamera Seçin</label>
            <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}
              style={{ width: '100%', padding: '0.625rem', borderRadius: '0.5rem', fontSize: '13px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc' }}>
              {cameraDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Kamera ${d.deviceId.slice(0, 8)}`}</option>)}
            </select>
          </div>
        )}
        <div style={{ position: 'relative', backgroundColor: '#000', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1rem', minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video ref={videoRef} style={{ width: '100%', maxHeight: '350px', objectFit: 'cover', display: scanning ? 'block' : 'none' }} playsInline muted />
          {!scanning && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '0.5rem' }}>📷</div>
              <div style={{ fontSize: '14px' }}>Kamera başlatılmadı</div>
            </div>
          )}
          {scanning && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '70%', height: '3px', backgroundColor: '#06b6d4', boxShadow: '0 0 20px #06b6d4', opacity: 0.8, animation: 'scan 2s ease-in-out infinite' }} />
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {!scanning ? (
            <button onClick={startCamera} className="btn btn-primary" style={{ flex: 1 }}>
              📷 Kamerayı Başlat
            </button>
          ) : (
            <button onClick={stopCamera} className="btn btn-danger" style={{ flex: 1 }}>
              ⏹️ Taramayı Durdur
            </button>
          )}
        </div>
      </div>

      {/* Manual Input */}
      <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>⌨️ Manuel Giriş</h3>
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.75rem' }}>
          <input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Barkod numarası veya telefon girin..."
            style={{ flex: 1, padding: '0.875rem 1rem', borderRadius: '0.75rem', fontSize: '16px', backgroundColor: '#0f172a', border: '2px solid #334155', color: '#f8fafc' }}
            autoFocus inputMode="numeric" />
          <button type="submit" className="btn btn-primary" disabled={searchLoading}>
            {searchLoading ? '⏳' : '🔍'} Ara
          </button>
        </form>
      </div>

      {/* Scan Result */}
      {scanResult && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '1.25rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>🔍 Tarama Sonucu</h3>
          <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #334155', marginBottom: '1rem' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Barkod</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#06b6d4', fontFamily: 'monospace' }}>{scanResult}</div>
          </div>
          {searchLoading ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>⏳ Aranıyor...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {/* Inventory Match */}
              <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '1rem', border: `1px solid ${inventoryMatch ? '#10b981' : '#334155'}` }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '0.5rem' }}>📦 Envanter</div>
                {inventoryMatch ? (
                  <>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>{inventoryMatch.name}</div>
                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: '0.25rem' }}>Stok: {inventoryMatch.quantity} adet</div>
                    {inventoryMatch.price > 0 && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{formatCurrency(inventoryMatch.price)}</div>}
                  </>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Eşleşme bulunamadı</div>
                )}
              </div>
              {/* Sales Match */}
              <div style={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', padding: '1rem', border: `1px solid ${salesMatch ? '#3b82f6' : '#334155'}` }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '0.5rem' }}>💰 Satışlar</div>
                {salesMatch ? (
                  <>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>{salesMatch.length} işlem</div>
                    <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '0.25rem' }}>Toplam: {formatCurrency(totalSalesAmount)}</div>
                  </>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Eşleşme bulunamadı</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Sales if matched */}
      {salesMatch && salesMatch.length > 0 && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '1.25rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>💰 Son Satışlar</h3>
          {salesMatch.map(sale => (
            <div key={sale.id} style={{ backgroundColor: '#0f172a', borderRadius: '0.5rem', padding: '0.75rem', borderLeft: `4px solid ${(parseFloat(sale.amount) || 0) < 0 ? '#ef4444' : '#3b82f6'}`, marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>{formatCurrency(sale.amount || 0)}</span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{sale.date || ''}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '0.25rem' }}>{sale.category || ''} • {sale.userName || ''}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Scans */}
      <div style={{ backgroundColor: '#1e293b', borderRadius: '1rem', border: '1px solid #334155', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📜 Son Taramalar</h3>
        {recentScans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>Henüz tarama yapılmadı</div>
        ) : (
          recentScans.map(scan => (
            <div key={scan.id} style={{ backgroundColor: '#0f172a', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#06b6d4', fontFamily: 'monospace' }}>{scan.code}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{scan.scannedByName} • {scan.scannedAt ? new Date(scan.scannedAt).toLocaleString('tr-TR') : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                {scan.foundInventory && <span style={{ padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '10px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981' }}>📦 Envanter</span>}
                {scan.foundSales && <span style={{ padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '10px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>💰 Satış</span>}
                {!scan.foundInventory && !scan.foundSales && <span style={{ padding: '0.15rem 0.5rem', borderRadius: '9999px', fontSize: '10px', backgroundColor: 'rgba(100,116,139,0.15)', color: '#94a3b8' }}>Bulunamadı</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
