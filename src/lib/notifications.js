export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

export function sendLocalNotification(title, body, url = '/dashboard') {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, { body, icon: '/icon-192.svg', tag: 'stv1-' + Date.now() })
    n.onclick = () => { window.focus(); window.location.href = url }
    setTimeout(() => n.close(), 5000)
  } catch (e) {
    navigator.serviceWorker?.ready?.then(reg => {
      reg.showNotification(title, { body, icon: '/icon-192.svg', data: { url } })
    })
  }
}

export function registerForPush() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: null }).catch(() => {})
    })
  }
}
