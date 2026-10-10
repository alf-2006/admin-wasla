import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase/client';
import { getDeviceToken } from '../store/auth';
import { toast } from '../store/toast';

/** بصمة المفتاح العام الحالي — لكشف الاشتراكات المبنية على مفتاح قديم بعد تدوير VAPID */
const PUSH_KEY_FP_STORE = 'wasla_push_key_fp';
const currentKeyFingerprint = (): string | null => {
  const key = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? '';
  return key.length >= 12 ? key.slice(0, 12) : null;
};
const storedKeyFingerprint = (): string | null => {
  try {
    return localStorage.getItem(PUSH_KEY_FP_STORE);
  } catch {
    return null;
  }
};
const storeKeyFingerprint = (fp: string): void => {
  try {
    localStorage.setItem(PUSH_KEY_FP_STORE, fp);
  } catch {
    // ignore
  }
};

export function usePWA({ memberId, memberEmail }: { memberId?: number; memberEmail?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const autoResubscribed = useRef(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const saveSubscription = async (subscription: PushSubscription) => {
    if (!memberId || !memberEmail) return;
    const { error } = await supabase.rpc('save_push_subscription', {
      p_member_id: memberId,
      p_email: memberEmail,
      p_subscription: JSON.parse(JSON.stringify(subscription)),
      p_device_token: getDeviceToken(),
    });
    if (error) throw error;
  };

  /**
   * اشتراك سليم دائماً: يعيد استخدام اشتراك المتصفح فقط إذا كان مبنياً على
   * مفتاح VAPID الحالي، وإلا يلغي القديم وينشئ جديداً (بعد تدوير المفاتيح
   * الاشتراك القديم ميت عند المزود — الاحتفاظ به يعني زراً أخضر كاذباً).
   */
  const ensureFreshSubscription = async (): Promise<PushSubscription> => {
    const reg = await navigator.serviceWorker.ready;
    const fp = currentKeyFingerprint();
    if (!fp) throw new Error('لم يتم تكوين مفتاح الإشعارات في النظام.');
    const existing = await reg.pushManager.getSubscription().catch(() => null);
    if (existing && storedKeyFingerprint() === fp) return existing;
    if (existing) {
      await existing.unsubscribe().catch(() => undefined);
    }
    const fresh = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
    });
    return fresh;
  };

  const markSubscribed = async (subscription: PushSubscription) => {
    await saveSubscription(subscription);
    const fp = currentKeyFingerprint();
    if (fp) storeKeyFingerprint(fp);
    setIsSubscribed(true);
  };

  // إعادة اشتراك صامتة: الـ PWA أحياناً يفقد اشتراك المتصفح بعد تحديث
  // نسخة التطبيق، فيظهر الزر غير مفعل رغم أن الإذن ممنوح. إذا كان الإذن
  // ممنوحاً ولا يوجد اشتراك، أعد الاشتراك والحفظ تلقائياً بلا إزعاج.
  useEffect(() => {
    if (autoResubscribed.current || isSubscribed || !memberId || !memberEmail) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    autoResubscribed.current = true;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        const fp = currentKeyFingerprint();
        // اشتراك موجود ومبني على المفتاح الحالي — أكّد حفظه في القاعدة
        // (قد يكون مُسح من جهة الخادم) ثم اعتبره مفعلاً.
        if (sub && fp && storedKeyFingerprint() === fp) {
          try {
            await saveSubscription(sub);
          } catch {
            // سيُعاد المحاولة عند الضغط اليدوي — لا تزعج العضو
          }
          setIsSubscribed(true);
          return;
        }
        const fresh = await ensureFreshSubscription();
        await markSubscribed(fresh);
      })
      .catch(() => {
        // الفشل الصامت مقصود — يبقى الزر اليدوي هو طريق التفعيل
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubscribed, memberId, memberEmail]);

  const installPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const subscribeToPush = async () => {
    if (!memberId || !memberEmail) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.warning('يرجى السماح بالإشعارات من إعدادات المتصفح.');
        return;
      }

      const subscription = await ensureFreshSubscription();

      // Save to Supabase using our new RPC
      await markSubscribed(subscription);

      toast.success('تم تفعيل الإشعارات بنجاح!');
    } catch (err: any) {
      console.error(err);
      toast.error('تعذر تفعيل الإشعارات: ' + err.message);
    }
  };

  return { isInstallable, installPWA, isSubscribed, subscribeToPush };
}
