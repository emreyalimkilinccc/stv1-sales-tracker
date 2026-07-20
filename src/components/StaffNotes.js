'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useToast } from '@/components/Toast'

export default function StaffNotes() {
  const { user } = useAuth()
  const toast = useToast()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchNotes = async () => {
      try {
        const snap = await getDocs(collection(db, 'staffNotes'))
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        setNotes(data.filter(n => {
          const noteDate = n.createdAt?.toDate ? n.createdAt.toDate() : null
          if (!noteDate) return true
          const today = new Date()
          const diff = (today - noteDate) / (1000 * 60 * 60 * 24)
          return diff < 2
        }))
      } catch (e) {}
      setLoading(false)
    }
    fetchNotes()
  }, [user])

  if (!user) return null

  const handleSave = async () => {
    if (!noteText.trim()) { toast('Not yazın', 'error'); return }
    setSaving(true)
    try {
      await addDoc(collection(db, 'staffNotes'), {
        text: noteText.trim(),
        userId: user.uid,
        userName: user.name || user.email,
        createdAt: new Date().toISOString()
      })
      const snap = await getDocs(collection(db, 'staffNotes'))
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
      setNoteText('')
      toast('Not bırakıldı!', 'success')
    } catch (e) {
      toast('Kaydedilemedi', 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'staffNotes', id))
      setNotes(prev => prev.filter(n => n.id !== id))
    } catch (e) {}
  }

  return (
    <div className="card">
      <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.75rem' }}>
        📝 Not Defteri
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '400', marginLeft: '0.5rem' }}>
          Bir sonraki personele not bırak
        </span>
      </h3>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input type="text" value={noteText} onChange={(e) => setNoteText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Notunuzu yazın..." className="form-input" style={{ flex: 1, fontSize: '13px' }} />
        <button onClick={handleSave} disabled={saving || !noteText.trim()} style={{
          padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '13px', fontWeight: '600',
          border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
          background: noteText.trim() ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#334155',
          color: '#fff', opacity: noteText.trim() ? 1 : 0.5, whiteSpace: 'nowrap'
        }}>
          {saving ? '⏳' : '📤 Bırak'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '13px' }}>Yükleniyor...</div>
      ) : notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '13px' }}>Henüz not yok — ilk notu sen bırak</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {notes.slice(0, 5).map(n => {
            const time = n.createdAt?.toDate ? n.createdAt.toDate() : new Date(n.createdAt)
            const isOwn = n.userId === user.uid
            return (
              <div key={n.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.625rem 0.75rem', borderRadius: '0.5rem',
                backgroundColor: isOwn ? 'rgba(245,158,11,0.08)' : '#0f172a',
                border: `1px solid ${isOwn ? 'rgba(245,158,11,0.2)' : '#1e293b'}`
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '13px', color: '#f8fafc' }}>{n.text}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '0.125rem' }}>
                    {n.userName} • {time.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {(isOwn || ['ADMIN', 'MANAGER'].includes(user.role)) && (
                  <button onClick={() => handleDelete(n.id)} style={{
                    width: '22px', height: '22px', borderRadius: '50%', border: 'none',
                    backgroundColor: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '11px',
                    flexShrink: 0
                  }}>✕</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
