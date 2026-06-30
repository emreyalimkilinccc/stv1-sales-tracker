'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Celebration from '@/components/Celebration'

export default function LotteryCelebration() {
  const [isActive, setIsActive] = useState(false)
  const [winnerName, setWinnerName] = useState('')

  useEffect(() => {
    const checkLottery = async () => {
      try {
        const now = new Date()
        const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })
        const snapshot = await getDocs(query(collection(db, 'lottery'), where('date', '==', todayStr)))
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data()
          if (data.isActive && data.winner) {
            const expiresAt = new Date(data.expiresAt)
            if (now < expiresAt) {
              setIsActive(true)
              setWinnerName(data.winner)
              return
            }
          }
        }
        setIsActive(false)
      } catch (error) {}
    }

    checkLottery()
    const interval = setInterval(checkLottery, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <Celebration active={isActive} />
      {isActive && (
        <div style={{
          position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'rgba(16, 185, 129, 0.95)', color: '#fff',
          padding: '0.75rem 1.5rem', borderRadius: '9999px', fontSize: '14px', fontWeight: '600',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)', zIndex: 10000,
          animation: 'fadeIn 0.5s ease'
        }}>
          🏆 <strong>{winnerName}</strong> bugünün şanslı kişisi! 🎉
        </div>
      )}
    </>
  )
}
