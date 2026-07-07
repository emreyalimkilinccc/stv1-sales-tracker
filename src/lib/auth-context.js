'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

const AuthContext = createContext({
  user: null,
  loading: true,
  signIn: async () => {},
  signInWithSalesCode: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  changePassword: async () => {}
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
            role: 'STAFF',
            name: '',
            monthlyQuota: 0,
            category: ''
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

  const signInWithSalesCode = async (salesCode, password) => {
    const usersRef = collection(db, 'user')
    const q = query(usersRef, where('salesCode', '==', salesCode))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      throw new Error('Satış kodu bulunamadı')
    }

    const userDoc = querySnapshot.docs[0]
    const userData = userDoc.data()
    const firestoreDocId = userDoc.id
    
    // Firestore doc'u UID ile eşleşmiyorsa sync et
    const result = await signInWithEmailAndPassword(auth, userData.email, password)
    
    if (firestoreDocId !== result.user.uid) {
      const { id: oldId, ...rest } = userData
      await setDoc(doc(db, 'user', result.user.uid), {
        ...rest,
        email: userData.email,
        salesCode: userData.salesCode || salesCode,
        name: userData.name,
        role: userData.role || 'STAFF',
        storeId: userData.storeId || null,
        category: userData.category || '',
        monthlyQuota: userData.monthlyQuota || 0,
        createdAt: userData.createdAt || new Date().toISOString()
      })
    }
    
    // setUser çağırma — onAuthStateChanged zaten tetiklenecek
    return result
  }

  const signUp = async (email, password, name, role = 'STAFF', storeId = null, salesCode = null) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await setDoc(doc(db, 'user', result.user.uid), {
      name,
      email,
      role,
      storeId,
      salesCode,
      createdAt: new Date().toISOString()
    })
    setUser({
      uid: result.user.uid,
      email: result.user.email,
      name,
      role,
      salesCode
    })
    return result
  }

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
    window.location.href = '/login'
  }

  const changePassword = async (newPassword) => {
    if (!auth.currentUser) {
      throw new Error('Kullanıcı giriş yapmamış')
    }
    await updatePassword(auth.currentUser, newPassword)
  }

  const value = {
    user,
    loading,
    signIn,
    signInWithSalesCode,
    signUp,
    signOut,
    changePassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
