const CACHE_NAME = 'stv1-v2'
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/sales',
  '/reports',
  '/oylama',
  '/manifest.json'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'STV1 Bildirim'
  const options = {
    body: data.body || 'Yeni bir bildiriminiz var',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/dashboard' },
    actions: [
      { action: 'open', title: 'Görüntüle' },
      { action: 'dismiss', title: 'Kapat' }
    ]
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const url = event.notification.data?.url || '/dashboard'
      for (const client of clients) {
        if (client.url.includes(url)) return client.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
