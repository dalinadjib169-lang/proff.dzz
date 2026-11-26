import { playSound, playSynthesizedChime } from './sounds';

/**
 * Mobile-friendly & PWA-ready push notifications helper for TeachDZ.
 * Uses Service Worker Registration + Web Push VAPID subscriptions so notifications
 * arrive with sound and text even when the app is closed (like Facebook).
 */

export type PushSubscribeResult = {
  ok: boolean;
  mode: 'webpush' | 'local' | 'webview' | 'iframe' | 'denied' | 'unsupported' | 'error';
  error?: string;
};

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

function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function isRunningInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function isAndroidWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /;\s*wv\b|\bwv\b|AppCreator|Android.*Version\/\d+/i.test(ua);
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
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

export async function syncSubscriptionPayload(uid: string, subscription: any): Promise<boolean> {
  if (!uid || !subscription) return false;
  try {
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, subscription }),
    });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) return false;
    return true;
  } catch (err) {
    console.warn('Sync push subscription error:', err);
    return false;
  }
}

async function getReadyServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  let registration = await navigator.serviceWorker.getRegistration('/sw.js');
  if (!registration) {
    registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
  }
  try {
    const readyReg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    return readyReg || registration || null;
  } catch {
    return registration || null;
  }
}

export async function subscribeToPushNotificationsDetailed(uid: string): Promise<PushSubscribeResult> {
  if (!uid || typeof window === 'undefined') {
    return { ok: false, mode: 'unsupported', error: 'بيانات المستخدم غير متوفرة' };
  }

  if (isAndroidWebView()) {
    return {
      ok: false,
      mode: 'webview',
      error: 'تطبيق WebView (AppCreator24) لا يدعم إشعارات المتصفح؛ استخدم Chrome لتثبيت التطبيق أو فعّل OneSignal في AppCreator24.',
    };
  }

  if (!('Notification' in window)) {
    return {
      ok: false,
      mode: 'unsupported',
      error: 'هذا المتصفح لا يدعم إشعارات الويب',
    };
  }

  try {
    const permission = await requestNotificationPermission();
    if (permission === 'denied') {
      return { ok: false, mode: 'denied', error: 'الإشعارات محظورة من المتصفح' };
    }
    if (permission !== 'granted') {
      return {
        ok: false,
        mode: isRunningInIframe() ? 'iframe' : 'error',
        error: isRunningInIframe()
          ? 'المعاينة داخل الإطار تمنع طلب إذن الإشعارات'
          : 'لم يتم منح إذن الإشعارات في النافذة المنبثقة',
      };
    }

    if (!('serviceWorker' in navigator)) {
      return { ok: true, mode: 'local' };
    }

    const registration = await getReadyServiceWorkerRegistration();
    if (!registration || !('pushManager' in registration)) {
      return { ok: true, mode: 'local' };
    }

    // Check if Express Web Push backend is available (static hosts like Vercel rewrite /api/* to index.html)
    const keyRes = await fetch('/api/push/vapid-public-key');
    const contentType = keyRes.headers.get('content-type') || '';
    if (!keyRes.ok || !contentType.includes('application/json')) {
      return { ok: true, mode: 'local' };
    }

    const { publicKey } = await keyRes.json();
    if (!publicKey) {
      return { ok: true, mode: 'local' };
    }

    const convertedKey = urlBase64ToUint8Array(publicKey);

    let subscription = await registration.pushManager.getSubscription();
    if (subscription && subscription.options?.applicationServerKey) {
      const existingKeyBytes = new Uint8Array(subscription.options.applicationServerKey);
      if (!uint8ArraysEqual(existingKeyBytes, convertedKey)) {
        await subscription.unsubscribe().catch(() => {});
        subscription = null;
      }
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey.buffer as ArrayBuffer,
      });
    }

    const saved = await syncSubscriptionPayload(uid, subscription.toJSON ? subscription.toJSON() : subscription);
    return saved ? { ok: true, mode: 'webpush' } : { ok: true, mode: 'local' };
  } catch (err: any) {
    console.warn('Push subscription setup skipped/failed:', err);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      return { ok: true, mode: 'local' };
    }
    return {
      ok: false,
      mode: isRunningInIframe() ? 'iframe' : 'error',
      error: err?.message || 'تعذر تفعيل خدمة الإشعارات',
    };
  }
}

export async function subscribeToPushNotifications(uid: string): Promise<boolean> {
  const result = await subscribeToPushNotificationsDetailed(uid);
  return result.ok && result.mode === 'webpush';
}

export async function getPushServerStatus(uid: string): Promise<{ subscribed: boolean; count: number; backendAvailable?: boolean }> {
  if (!uid) return { subscribed: false, count: 0, backendAvailable: false };
  try {
    const res = await fetch(`/api/push/status?uid=${encodeURIComponent(uid)}`);
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || !ct.includes('application/json')) {
      return { subscribed: false, count: 0, backendAvailable: false };
    }
    const data = await res.json();
    return { subscribed: Boolean(data.subscribed), count: Number(data.count || 0), backendAvailable: true };
  } catch {
    return { subscribed: false, count: 0, backendAvailable: false };
  }
}

export async function sendTestServerPush(
  uid: string,
  delayMs = 0
): Promise<{ ok: boolean; scheduled?: boolean; devices?: number; error?: string }> {
  if (!uid) return { ok: false, error: 'Missing user id' };
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, delayMs }),
    });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return { ok: false, error: 'خادم إشعارات الخلفية غير متاح على هذه الاستضافة الساكنة' };
    }
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Failed to send test push' };
    }
    return data;
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' };
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
  roomId?: string;
  senderId?: string;
  badgeCount?: number;
}) {
  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
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
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
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
      const registration = await getReadyServiceWorkerRegistration();
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
  if (typeof navigator !== 'undefined' && typeof (navigator as any).clearAppBadge === 'function') {
    (navigator as any).clearAppBadge().catch(() => {});
  }
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await getReadyServiceWorkerRegistration();
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
