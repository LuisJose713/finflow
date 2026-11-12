/* FinFlow notifications: click a reminder to open its relevant page.
   No background subscription or scheduled push is implied by this worker. */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  const destination = url === '/transactions' ? '/transactions' : '/dashboard';
  event.waitUntil(clients.openWindow(destination));
});
