const { initializeApp } = require('firebase/app')
const { getFirestore, collection, query, where, getDocs, deleteDoc } = require('firebase/firestore')

const app = initializeApp({
  apiKey: "AIzaSyDtlFn7PRWtVvSEkvYLlu4WGVLBSVrNRxc",
  authDomain: "satis-takip-sistemi.firebaseapp.com",
  projectId: "satis-takip-sistemi",
  storageBucket: "satis-takip-sistemi.firebasestorage.app",
  messagingSenderId: "12577411544",
  appId: "1:12577411544:web:cd4dd2b0719bd0548d22ad"
})

const db = getFirestore(app)

async function cleanBreaks() {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })
  const q = query(collection(db, 'breaks'), where('date', '==', today))
  const snap = await getDocs(q)
  let deleted = 0
  for (const d of snap.docs) {
    await deleteDoc(d.ref)
    deleted++
  }
  console.log(deleted + ' kayıt silindi')
}

cleanBreaks().catch(console.error)
