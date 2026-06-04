/**
 * Mobile-friendly & PWA-ready push notifications helper for TeachDZ.
 * Uses Service Worker Registration where available to trigger active wakeups
 * and lock screen notifications, falling back to window.Notification.
 */

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications.');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'default';
  }
}

interface CustomNotificationOptions extends NotificationOptions {
  url?: string;
}

export async function displayNotification(title: string, options: CustomNotificationOptions = {}) {
  // Ensure we have permission
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Ensure default icon and badge are loaded
  const mergedOptions: NotificationOptions = {
    icon: '/prof_dali_logo.png',
    badge: '/prof_dali_logo.png',
    vibrate: [200, 100, 200, 100, 300],
    dir: 'rtl',
    lang: 'ar',
    ...options,
  };

  // If a URL to navigate is passed, set database state for ServiceWorker
  if (options.url) {
    (mergedOptions as any).data = options.url;
  }

  // Try to use Service Worker registration first for proper lockscreen behavior
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, mergedOptions);
        return;
      }
    }
  } catch (err) {
    console.warn('Service Worker registration not ready for notification, falling back to window.Notification', err);
  }

  // Fallback to standard window-level Notification API
  try {
    new Notification(title, mergedOptions);
  } catch (err) {
    console.error('Fallback Notification window-level API failed:', err);
  }
}
