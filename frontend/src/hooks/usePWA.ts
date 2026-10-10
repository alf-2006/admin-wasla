import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase/client';
import { getDeviceToken } from '../store/auth';
import { toast } from '../store/toast';

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

  const createSubscription = async () => {
    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      throw new Error('لم يتم تكوين مفتاح الإشعارات في النظام.');
    }
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    });
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
        if (sub) {
          setIsSubscribed(true);
          return;
        }
        const fresh = await createSubscription();
        await saveSubscription(fresh);
        setIsSubscribed(true);
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

      const subscription = await createSubscription();

      // Save to Supabase using our new RPC
      await saveSubscription(subscription);

      setIsSubscribed(true);
      toast.success('تم تفعيل الإشعارات بنجاح!');
    } catch (err: any) {
      console.error(err);
      toast.error('تعذر تفعيل الإشعارات: ' + err.message);
    }
  };

  return { isInstallable, installPWA, isSubscribed, subscribeToPush };
}
