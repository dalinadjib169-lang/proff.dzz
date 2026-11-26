import React, { useEffect, useState } from 'react';
import { BellRing, Download, ExternalLink, ShieldAlert, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  getPushServerStatus,
  isRunningInIframe,
  subscribeToPushNotifications,
  sendTestServerPush,
} from '../lib/notifications';
import { unlockAudio, playSound } from '../lib/sounds';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

export default function PushPermissionBanner() {
  const { profile } = useAuth();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [inIframe, setInIframe] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [serverSubscribed, setServerSubscribed] = useState<boolean | null>(null);
  const [activating, setActivating] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const supportsNotification = typeof window !== 'undefined' && 'Notification' in window;

  useEffect(() => {
    setInIframe(isRunningInIframe());
    if (supportsNotification) {
      setPermission(Notification.permission);
    }
  }, [supportsNotification]);

  useEffect(() => {
    if (!profile?.uid) return;
    let active = true;
    getPushServerStatus(profile.uid).then((st) => {
      if (active) setServerSubscribed(st.subscribed);
    });
    return () => {
      active = false;
    };
  }, [profile?.uid]);

  if (!profile?.uid || dismissed) return null;

  // Hide automatically once granted & synced to server (unless iOS Safari still needs Home Screen install)
  const needsIOSInstall = isIOS && !isInstalled && !supportsNotification;
  if (permission === 'granted' && serverSubscribed === true && !needsIOSInstall) {
    return null;
  }

  // Only show if not yet subscribed/granted, or blocked, or inside iframe without active push
  if (serverSubscribed === null && permission === 'granted') {
    return null;
  }

  const handleEnable = async () => {
    if (!profile?.uid) return;
    setActivating(true);
    try {
      unlockAudio();
      const ok = await subscribeToPushNotifications(profile.uid);
      const nextPerm = supportsNotification ? Notification.permission : 'denied';
      setPermission(nextPerm);

      if (ok) {
        setServerSubscribed(true);
        await updateDoc(doc(db, 'users', profile.uid), {
          'settings.isPushNotificationsEnabled': true,
          'settings.isNotificationSoundEnabled': true,
        }).catch(() => {});
        playSound('notification');
        await sendTestServerPush(profile.uid, 0);
        toast.success('تم تفعيل الإشعارات الصوتية والكتابية في الخلفية بنجاح!');
      } else if (nextPerm === 'denied') {
        toast.error('الإشعارات محظورة من المتصفح، يرجى السماح بها من إعدادات الموقع');
      } else {
        toast.error('تعذر التفعيل داخل هذه النافذة، افتح التطبيق مباشرة في المتصفح');
      }
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-indigo-500/30 bg-gradient-to-l from-indigo-950/90 via-slate-900/95 to-purple-950/90 p-3.5 sm:p-4 shadow-xl backdrop-blur-xl" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 mt-0.5">
            {permission === 'denied' ? (
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            ) : (
              <BellRing className="w-5 h-5 text-indigo-300 animate-pulse" />
            )}
          </div>
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-black text-white">
              {needsIOSInstall
                ? 'ثبّت التطبيق لتفعيل الإشعارات مثل فيسبوك'
                : permission === 'denied'
                ? 'الإشعارات محظورة حالياً من المتصفح'
                : 'تفعيل الإشعارات الفورية حتى عند إغلاق التطبيق'}
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
              {inIframe
                ? 'المعاينة داخل الإطار تمنع إشعارات الخلفية؛ افتح التطبيق مباشرة في المتصفح لتصلك الرسائل صوتياً وكتابياً عند إغلاق التطبيق.'
                : needsIOSInstall
                ? 'على أجهزة iPhone اضغط على زر المشاركة ثم "إضافة إلى الشاشة الرئيسية" لتصلك التنبيهات الصوتية والكتابية.'
                : permission === 'denied'
                ? 'اضغط على أيقونة القفل 🔒 في شريط العنوان ثم فعّل "الإشعارات (Allow)" لتصلك الرسائل والتنبيهات.'
                : 'احصل على تنبيه صوتي وإشعار كتابي فوري للرسائل والمكالمات والتعليقات حتى عند إغلاق التطبيق.'}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1.5">
              {inIframe ? (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/25 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  فتح التطبيق مباشرة وتفعيل الإشعارات
                </a>
              ) : needsIOSInstall ? (
                <button
                  type="button"
                  onClick={() => setShowIOSGuide((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  طريقة التثبيت على iPhone
                </button>
              ) : (
                permission !== 'denied' && (
                  <button
                    type="button"
                    onClick={handleEnable}
                    disabled={activating}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {activating ? 'جاري التفعيل...' : 'تفعيل الإشعارات الآن (صوت + كتابة)'}
                  </button>
                )
              )}

              {isInstallable && !isInstalled && !inIframe && (
                <button
                  type="button"
                  onClick={install}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/25 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  تثبيت التطبيق على الهاتف
                </button>
              )}
            </div>

            {showIOSGuide && (
              <p className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 mt-2">
                1. اضغط على أيقونة المشاركة (Share) أسفل متصفح Safari. 2. اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen). 3. افتح التطبيق من الشاشة الرئيسية وفعّل الإشعارات.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
