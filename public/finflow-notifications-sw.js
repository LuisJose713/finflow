/* FinFlow Web Push: payloads are supplied by the authenticated backend. */
self.addEventListener('push', event => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }
  if (!payload || typeof payload !== 'object') return;
  const title = typeof payload.title === 'string' ? payload.title.slice(0, 120) : 'FinFlow';
  const body = typeof payload.body === 'string' ? payload.body.slice(0, 240) : '';
  const url = payload.url === '/transactions' ? '/transactions' : '/dashboard';
  event.waitUntil(self.registration.showNotification(title, {
    body, icon: '/icons/finflow-192.png', badge: '/icons/finflow-192.png',
    tag: 'finflow-daily-reminder', data: { url }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const destination = event.notification.data?.url === '/transactions' ? '/transactions' : '/dashboard';
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const target = new URL(destination, self.location.origin).href;
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        if ('navigate' in client) await client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow(target);
  })());
});
