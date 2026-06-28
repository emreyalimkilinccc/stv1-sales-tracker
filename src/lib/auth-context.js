'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

const AuthContext = createContext({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {}
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'user', firebaseUser.uid))
        if (userDoc.exists()) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            ...userDoc.data()
          })
        } else {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'STAFF'
          })
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    const userDoc = await getDoc(doc(db, 'user', result.user.uid))
    if (userDoc.exists()) {
      setUser({
        uid: result.user.uid,
        email: result.user.email,
        ...userDoc.data()
      })
    }
    return result
  }

  const signUp = async (email, password, name, role = 'STAFF', storeId = null) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'user', result.user.uid), {
      name,
      email,
      role,
      storeId,
      createdAt: new Date().toISOString()
    })
    setUser({
      uid: result.user.uid,
      email: result.user.email,
      name,
      role,
      storeId
    })
    return result
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
