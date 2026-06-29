import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDtlFn7PRWtVvSEkvYLlu4WGVLBSVrNRxc",
  authDomain: "satis-takip-sistemi.firebaseapp.com",
  projectId: "satis-takip-sistemi",
  storageBucket: "satis-takip-sistemi.firebasestorage.app",
  messagingSenderId: "12577411544",
  appId: "1:12577411544:web:cd4dd2b0719bd0548d22ad",
  measurementId: "G-4T9TG8Z42T"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') console.log('Offline persistence birden fazla sekme ile calistirilamaz')
  else if (err.code === 'unimplemented') console.log('Tarayici offline desteklemiyor')
})

export const auth = getAuth(app)
export default app
