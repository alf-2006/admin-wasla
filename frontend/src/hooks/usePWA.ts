import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { toast } from '../store/toast';

export function usePWA({ memberId, memberEmail }: { memberId?: number; memberEmail?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

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

      const reg = await navigator.serviceWorker.ready;
      
      // Get VAPID key from backend
      // Assuming whatsapp-service is running on port 3000 if not proxying, 
      // but let's use the local fallback or an env var. 
      // We stored VAPID in env for the backend. The frontend needs the public key.
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
         toast.error('لم يتم تكوين مفتاح الإشعارات في النظام.');
         return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      });

      // Save to Supabase using our new RPC
      const { error } = await supabase.rpc('save_push_subscription', {
        p_member_id: memberId,
        p_email: memberEmail,
        p_subscription: JSON.parse(JSON.stringify(subscription))
      });

      if (error) throw error;
      
      setIsSubscribed(true);
      toast.success('تم تفعيل الإشعارات بنجاح!');
    } catch (err: any) {
      console.error(err);
      toast.error('تعذر تفعيل الإشعارات: ' + err.message);
    }
  };

  return { isInstallable, installPWA, isSubscribed, subscribeToPush };
}
