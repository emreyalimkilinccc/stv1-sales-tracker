import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export async function logActivity(action, details = {}, userId = null, userName = null) {
  try {
    await addDoc(collection(db, 'activityLog'), {
      action,
      details,
      userId: userId || 'system',
      userName: userName || 'Sistem',
      timestamp: serverTimestamp()
    })
  } catch (error) {
    console.error('Log error:', error)
  }
}

const ACTIVITY_LABELS = {
  'sale_created': 'Satış eklendi',
  'sale_updated': 'Satış düzenlendi',
  'sale_deleted': 'Satış silindi',
  'sale_sent': 'Satış gönderildi',
  'user_created': 'Kullanıcı eklendi',
  'user_updated': 'Kullanıcı düzenlendi',
  'user_deleted': 'Kullanıcı silindi',
  'store_created': 'Mağaza eklendi',
  'lottery_started': 'Çekiliş başlatıldı',
  'poll_created': 'Anket oluşturuldu',
  'poll_voted': 'Oy kullanıldı',
  'poll_concluded': 'Anket sonuçlandırıldı',
  'login': 'Giriş yapıldı',
  'export_excel': 'Excel yüklendi',
  'category_update': 'Kategoriler güncellendi'
}

export function getActivityLabel(action) {
  return ACTIVITY_LABELS[action] || action
}
