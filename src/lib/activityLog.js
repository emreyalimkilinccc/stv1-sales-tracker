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
  'login': 'Giriş yapıldı',
  'logout': 'Çıkış yapıldı',
  'password_changed': 'Şifre değiştirildi',
  'birthday_updated': 'Doğum tarihi güncellendi',
  'settings_updated': 'Ayarlar güncellendi',

  'sale_created': 'Satış eklendi',
  'sale_updated': 'Satış düzenlendi',
  'sale_deleted': 'Satış silindi',
  'sale_sent': 'Satış gönderildi',

  'user_created': 'Kullanıcı eklendi',
  'user_updated': 'Kullanıcı düzenlendi',
  'user_deleted': 'Kullanıcı silindi',
  'store_created': 'Mağaza eklendi',
  'store_deleted': 'Mağaza silindi',
  'category_update': 'Kategoriler güncellendi',
  'quota_updated': 'Kota güncellendi',
  'backup_downloaded': 'Veri yedeklendi',

  'mola_started': 'Mola başlatıldı',
  'mola_sent': 'Mola gönderildi',
  'mola_completed': 'Mola tamamlandı',

  'schedule_saved': 'Vardiya kaydedildi',

  'finance_added': 'Muhasebe kaydı eklendi',
  'finance_deleted': 'Muhasebe kaydı silindi',

  'leave_created': 'İzin talebi oluşturuldu',
  'leave_approved': 'İzin talebi onaylandı',
  'leave_rejected': 'İzin talebi reddedildi',

  'poll_created': 'Anket oluşturuldu',
  'poll_voted': 'Oy kullanıldı',

  'lottery_started': 'Çekiliş başlatıldı',
  'lottery_winner': 'Çekiliş kazananı belirlendi',

  'inventory_created': 'Envanter kaydı eklendi',
  'inventory_updated': 'Envanter güncellendi',
  'inventory_deleted': 'Envanter silindi',

  'customer_created': 'Müşteri eklendi',
  'customer_updated': 'Müşteri güncellendi',
  'customer_deleted': 'Müşteri silindi',

  'incoming_created': 'Gelen ürün eklendi',
  'incoming_updated': 'Gelen ürün güncellendi',
  'incoming_deleted': 'Gelen ürün silindi',

  'delivery_created': 'Teslim kaydı oluşturuldu',
  'delivery_updated': 'Teslim güncellendi',
  'delivery_deleted': 'Teslim silindi',

  'cleaning_completed': 'Temizlik görevi tamamlandı',

  'export_csv': 'CSV dışa aktarıldı',
  'export_pdf': 'PDF dışa aktarıldı',
  'export_excel': 'Excel dışa aktarıldı',

  'kasko_calculated': 'KASKO hesaplama yapıldı'
}

export function getActivityLabel(action) {
  return ACTIVITY_LABELS[action] || action
}
