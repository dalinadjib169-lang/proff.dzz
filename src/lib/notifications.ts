import { playSound, playSynthesizedChime } from './sounds';

/**
 * Mobile-friendly & PWA-ready push notifications helper for TeachDZ.
 * Uses Service Worker Registration + Web Push VAPID subscriptions so notifications
 * arrive with sound and text even when the app is closed (like Facebook).
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications.');
    return 'denied';
  }

  try {
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'default';
  }
}

export async function subscribeToPushNotifications(uid: string): Promise<boolean> {
  if (!uid || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return false;

    const registration = await navigator.serviceWorker.ready;
    if (!registration || !('pushManager' in registration)) {
      return false;
    }

    const keyRes = await fetch('/api/push/vapid-public-key');
    if (!keyRes.ok) return false;
    const { publicKey } = await keyRes.json();
    if (!publicKey) return false;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey.buffer as ArrayBuffer,
      });
    }

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, subscription }),
    });

    return true;
  } catch (err) {
    console.warn('Push subscription setup skipped/failed:', err);
    return false;
  }
}

export async function sendRemotePushNotification(payload: {
  recipientId?: string;
  recipientIds?: string[];
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  url?: string;
  type?: string;
}) {
  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Non-blocking background push trigger
    console.warn('Remote push trigger warning:', err);
  }
}

interface CustomNotificationOptions extends NotificationOptions {
  url?: string;
  soundType?: 'message' | 'notification' | 'like' | 'comment' | 'call';
  playAudio?: boolean;
}

export async function displayNotification(title: string, options: CustomNotificationOptions = {}) {
  // Play crisp audio alert if requested
  if (options.playAudio !== false) {
    playSound(options.soundType || 'notification');
  }

  // Ensure we have permission for system text notification
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const { url, soundType, playAudio, ...nativeOptions } = options;

  const mergedOptions: any = {
    icon: '/prof_dali_logo.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200, 100, 300],
    silent: false,
    renotify: true,
    dir: 'rtl',
    lang: 'ar',
    ...nativeOptions,
  };

  if (url) {
    mergedOptions.data = { url };
  }

  // Try Service Worker registration first so lockscreen & closed/background tabs behave like Facebook
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, mergedOptions);
        return;
      }
    }
  } catch (err) {
    console.warn('Service Worker notification failed, falling back to window.Notification', err);
  }

  // Fallback to standard window-level Notification API
  try {
    new Notification(title, mergedOptions);
  } catch (err) {
    console.error('Fallback Notification window-level API failed:', err);
  }
}

export async function clearSystemNotifications() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'getNotifications' in registration) {
        const notifications = await registration.getNotifications();
        notifications.forEach(notification => notification.close());
      }
    } catch (e) {
      console.warn("Failed to clear system notifications:", e);
    }
  }
}

export function playTestNotificationSound() {
  playSynthesizedChime('notification');
}
