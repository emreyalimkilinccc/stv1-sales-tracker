'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function OylamaPage() {
  const { user } = useAuth()
  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''] })
  const [userVotes, setUserVotes] = useState({})
  const [editingPoll, setEditingPoll] = useState(null)
  const [showClosed, setShowClosed] = useState(true)

  const canManage = user && (user.role === 'ADMIN' || user.role === 'MANAGER')

  useEffect(() => {
    if (!user) return
    const unsubscribe = onSnapshot(collection(db, 'polls'), (snapshot) => {
      const pollsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      pollsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setPolls(pollsData)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!user) return
    const unsubscribe = onSnapshot(collection(db, 'votes'), (snapshot) => {
      const votes = {}
      snapshot.docs.forEach(d => {
        const v = d.data()
        if (v.userId === user.uid) votes[v.pollId] = v.optionIndex
      })
      setUserVotes(votes)
    })
    return () => unsubscribe()
  }, [user])

  const handleCreatePoll = async (e) => {
    e.preventDefault()
    const validOptions = newPoll.options.filter(o => o.trim() !== '')
    if (!newPoll.question.trim() || validOptions.length < 2) {
      alert('Soru ve en az 2 seçenek gereklidir!')
      return
    }
    try {
      await addDoc(collection(db, 'polls'), {
        question: newPoll.question.trim(),
        options: validOptions.map(text => ({ text: text.trim(), votes: 0 })),
        createdBy: user.name || user.email,
        createdById: user.uid,
        createdAt: serverTimestamp(),
        isActive: true
      })
      setNewPoll({ question: '', options: ['', ''] })
      setShowCreate(false)
    } catch (error) { alert('Hata: ' + error.message) }
  }

  const handleVote = async (pollId, optionIndex) => {
    if (userVotes[pollId] !== undefined) return
    try {
      const poll = polls.find(p => p.id === pollId)
      const newOptions = [...poll.options]
      newOptions[optionIndex].votes += 1
      await updateDoc(doc(db, 'polls', pollId), { options: newOptions })
      await addDoc(collection(db, 'votes'), {
        pollId, userId: user.uid, userName: user.name || user.email,
        optionIndex, createdAt: serverTimestamp()
      })
    } catch (error) { alert('Hata: ' + error.message) }
  }

  const handleToggleActive = async (pollId, currentActive) => {
    try {
      await updateDoc(doc(db, 'polls', pollId), { isActive: !currentActive })
    } catch (error) { alert('Hata: ' + error.message) }
  }

  const handleDeletePoll = async (pollId) => {
    if (!confirm('Bu oylamayı silmek istediğinize emin misiniz?')) return
    try {
      const votesSnapshot = await getDocs(query(collection(db, 'votes'), where('pollId', '==', pollId)))
      for (const v of votesSnapshot.docs) {
        await deleteDoc(doc(db, 'votes', v.id))
      }
      await deleteDoc(doc(db, 'polls', pollId))
    } catch (error) { alert('Hata: ' + error.message) }
  }

  const handleAddOption = () => {
    setNewPoll(p => ({ ...p, options: [...p.options, ''] }))
  }

  const handleRemoveOption = (idx) => {
    if (newPoll.options.length <= 2) return
    setNewPoll(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }))
  }

  const handleOptionChange = (idx, value) => {
    setNewPoll(p => {
      const newOpts = [...p.options]
      newOpts[idx] = value
      return { ...p, options: newOpts }
    })
  }

  const handleEditOption = (pollId, optionIdx, field, value) => {
    setEditingPoll(prev => {
      if (!prev || prev.id !== pollId) {
        const poll = polls.find(p => p.id === pollId)
        const newOpts = poll.options.map(o => ({ ...o }))
        newOpts[optionIdx][field] = value
        return { id: pollId, options: newOpts }
      }
      const newOpts = prev.options.map((o, i) => i === optionIdx ? { ...o, [field]: value } : { ...o })
      return { ...prev, options: newOpts }
    })
  }

  const handleSaveEdit = async (pollId) => {
    try {
      const validOptions = editingPoll.options.filter(o => o.text.trim() !== '')
      if (validOptions.length < 2) { alert('En az 2 seçenek gereklidir!'); return }
      await updateDoc(doc(db, 'polls', pollId), { options: validOptions })
      setEditingPoll(null)
    } catch (error) { alert('Hata: ' + error.message) }
  }

  const handleAddEditOption = (pollId) => {
    setEditingPoll(prev => {
      const poll = polls.find(p => p.id === pollId)
      const baseOpts = prev && prev.id === pollId ? prev.options : poll.options.map(o => ({ ...o }))
      return { id: pollId, options: [...baseOpts, { text: '', votes: 0 }] }
    })
  }

  const activePolls = polls.filter(p => p.isActive)
  const closedPolls = polls.filter(p => !p.isActive)

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div>🔑 Lütfen giriş yapın</div></div>
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div style={{ fontSize: '48px' }}>⏳</div></div>

  return (
    <div className="px-4 py-6 max-w-4xl mx-auto">
      <div className="page-header" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', marginBottom: '0.375rem' }}>🗳️ Oylama</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Anketleri görüntüleyin ve oy kullanın</p>
      </div>

      {/* Oluştur Butonu (Admin/Müdür) */}
      {canManage && (
        <button onClick={() => setShowCreate(!showCreate)} style={{
          width: '100%', marginBottom: '1rem', padding: '0.875rem',
          background: showCreate ? '#334155' : 'linear-gradient(135deg, #06b6d4, #0891b2)',
          color: showCreate ? '#94a3b8' : 'white', fontWeight: '600', borderRadius: '0.75rem', border: 'none', cursor: 'pointer'
        }}>
          {showCreate ? '✕ Kapat' : '➕ Yeni Anket Oluştur'}
        </button>
      )}

      {/* Oluşturma Formu */}
      {showCreate && (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>📝 Yeni Anket</h3>
          <form onSubmit={handleCreatePoll}>
            <div className="form-group">
              <label className="form-label">❓ Soru</label>
              <input type="text" value={newPoll.question} onChange={(e) => setNewPoll(p => ({ ...p, question: e.target.value }))}
                placeholder="Örn: En iyi kategori hangisi?" required className="form-input" />
            </div>
            <label className="form-label">📋 Seçenekler</label>
            {newPoll.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#94a3b8', minWidth: '20px' }}>{i + 1}.</span>
                <input type="text" value={opt} onChange={(e) => handleOptionChange(i, e.target.value)}
                  placeholder={`Seçenek ${i + 1}`} className="form-input" style={{ flex: 1 }} />
                {newPoll.options.length > 2 && (
                  <button type="button" onClick={() => handleRemoveOption(i)} style={{
                    padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: 'rgba(239,68,68,0.15)',
                    color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '14px'
                  }}>✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={handleAddOption} style={{
              width: '100%', padding: '0.625rem', borderRadius: '0.5rem', fontSize: '13px',
              backgroundColor: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px dashed #06b6d4',
              cursor: 'pointer', fontWeight: '600', marginBottom: '1rem'
            }}>+ Seçenek Ekle</button>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>🗳️ Oluştur</button>
          </form>
        </div>
      )}

      {/* Aktif Oylamalar */}
      {activePolls.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', marginBottom: '1rem' }}>🟢 Aktif Oylamalar ({activePolls.length})</h3>
          {activePolls.map(poll => {
            const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0)
            const hasVoted = userVotes[poll.id] !== undefined
            const isEditing = editingPoll && editingPoll.id === poll.id

            return (
              <div key={poll.id} className="card" style={{ marginBottom: '1rem', borderLeft: '4px solid #06b6d4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>❓ {poll.question}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '0.25rem' }}>
                      👤 {poll.createdBy} • 🗳️ {totalVotes} oy
                    </div>
                  </div>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      <button onClick={() => handleToggleActive(poll.id, poll.isActive)} style={{
                        padding: '0.375rem 0.625rem', borderRadius: '0.375rem', fontSize: '11px',
                        backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', cursor: 'pointer'
                      }}>⏹️ Kapat</button>
                      <button onClick={() => handleDeletePoll(poll.id)} style={{
                        padding: '0.375rem 0.625rem', borderRadius: '0.375rem', fontSize: '11px',
                        backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', cursor: 'pointer'
                      }}>🗑️</button>
                    </div>
                  )}
                </div>

                {/* Oylar */}
                <div className="space-y-2">
                  {poll.options.map((opt, i) => {
                    const pct = totalVotes > 0 ? (opt.votes / totalVotes * 100) : 0
                    const isMyVote = userVotes[poll.id] === i
                    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
                    const color = colors[i % colors.length]

                    if (isEditing) {
                      return (
                        <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="text" value={editingPoll.options[i]?.text || ''} onChange={(e) => handleEditOption(poll.id, i, 'text', e.target.value)}
                            className="form-input" style={{ flex: 1, padding: '0.5rem', fontSize: '13px' }} />
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>{opt.votes} oy</span>
                        </div>
                      )
                    }

                    return (
                      <div key={i} style={{ position: 'relative' }}>
                        <div style={{
                          height: '40px', borderRadius: '0.5rem', overflow: 'hidden', position: 'relative',
                          backgroundColor: '#0f172a', border: isMyVote ? `2px solid ${color}` : '1px solid #334155',
                          cursor: hasVoted ? 'default' : 'pointer', transition: 'all 0.3s ease'
                        }} onClick={() => !hasVoted && handleVote(poll.id, i)}>
                          <div style={{
                            height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}80, ${color})`,
                            borderRadius: '0.5rem', transition: 'width 0.5s ease'
                          }} />
                          <div style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            fontSize: '13px', fontWeight: '600', color: '#f8fafc', display: 'flex',
                            alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', zIndex: 1
                          }}>
                            {isMyVote && <span style={{ fontSize: '14px' }}>✓</span>}
                            {opt.text}
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>({opt.votes} oy • %{pct.toFixed(0)})</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {hasVoted && (
                  <div style={{ textAlign: 'center', fontSize: '12px', color: '#10b981', marginTop: '0.75rem', fontWeight: '600' }}>
                    ✅ Oyunuz kaydedildi
                  </div>
                )}

                {isEditing && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button onClick={() => handleAddEditOption(poll.id)} style={{
                      flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px',
                      backgroundColor: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: 'none', cursor: 'pointer', fontWeight: '600'
                    }}>+ Seçenek</button>
                    <button onClick={() => handleSaveEdit(poll.id)} style={{
                      flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px',
                      backgroundColor: '#06b6d4', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600'
                    }}>💾 Kaydet</button>
                    <button onClick={() => setEditingPoll(null)} style={{
                      flex: 1, padding: '0.5rem', borderRadius: '0.5rem', fontSize: '12px',
                      backgroundColor: '#334155', color: '#94a3b8', border: 'none', cursor: 'pointer', fontWeight: '600'
                    }}>✕ İptal</button>
                  </div>
                )}

                {canManage && !isEditing && (
                  <button onClick={() => setEditingPoll({ id: poll.id, options: poll.options.map(o => ({ ...o })) })} style={{
                    marginTop: '0.75rem', padding: '0.375rem 0.875rem', borderRadius: '0.5rem', fontSize: '12px',
                    backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'none', cursor: 'pointer', fontWeight: '500'
                  }}>✏️ Düzenle</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Kapatılmış Oylamalar */}
      {closedPolls.length > 0 && (
        <div>
          <button onClick={() => setShowClosed(!showClosed)} style={{
            width: '100%', padding: '0.75rem', marginBottom: '1rem',
            backgroundColor: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155',
            color: '#94a3b8', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <span>🔴 Kapatılmış Oylamalar ({closedPolls.length})</span>
            <span>{showClosed ? '▲' : '▼'}</span>
          </button>
          {showClosed && closedPolls.map(poll => {
            const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0)
            const winner = poll.options.reduce((a, b) => a.votes > b.votes ? a : b)
            return (
              <div key={poll.id} className="card" style={{ marginBottom: '0.75rem', borderLeft: '4px solid #ef4444', opacity: 0.7 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>
                  ❓ {poll.question}
                  {canManage && (
                    <button onClick={() => handleDeletePoll(poll.id)} style={{
                      marginLeft: '0.5rem', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '11px',
                      backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', cursor: 'pointer'
                    }}>🗑️</button>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '0.5rem' }}>
                  🗳️ {totalVotes} oy • 🏆 Kazanan: <strong style={{ color: '#10b981' }}>{winner.text}</strong> ({winner.votes} oy)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {poll.options.map((opt, i) => (
                    <span key={i} style={{
                      padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '11px', fontWeight: '500',
                      backgroundColor: opt.votes === winner.votes ? 'rgba(16,185,129,0.15)' : '#1e293b',
                      color: opt.votes === winner.votes ? '#10b981' : '#94a3b8',
                      border: `1px solid ${opt.votes === winner.votes ? 'rgba(16,185,129,0.3)' : '#334155'}`
                    }}>
                      {opt.text}: {opt.votes} oy
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {polls.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '0.75rem' }}>🗳️</div>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Henüz anket oluşturulmamış</p>
        </div>
      )}
    </div>
  )
}
