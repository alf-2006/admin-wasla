import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get('WASLA_ALLOWED_ORIGINS') ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const response = (body: unknown, status = 200, origin = '') => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' },
});

// إعداد VAPID
webpush.setVapidDetails(
  'mailto:dev@wasla.com',
  Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
);

serve(async (req) => {
  const origin = req.headers.get('Origin') ?? '';
  const reply = (body: unknown, status = 200) => response(body, status, origin);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin || allowedOrigins[0] || 'null' } });
  }
  
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return reply({ error: 'مطلوب توثيق.' }, 401);
    
    // التحقق من صلاحيات الإدارة التي تستدعي الرابط
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return reply({ error: 'الجلسة غير صالحة.' }, 401);
    
    // Admin only check
    const admins = (Deno.env.get('WHATSAPP_ADMIN_EMAILS') ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
    if (!user.email || !admins.includes(user.email.toLowerCase())) {
         return reply({ error: 'غير مخول بإرسال الإشعارات.' }, 403);
    }
    
    const { title, body, icon, url, memberIds } = await req.json();
    if (!title || !body || !Array.isArray(memberIds)) {
      return reply({ error: 'بيانات الإشعار غير مكتملة.' }, 400);
    }
    
    const validIds = memberIds.filter((id) => Number.isInteger(Number(id)));
    if (validIds.length === 0) return reply({ error: 'لا يوجد أعضاء.' }, 400);
    
    // جلب اشتراكات الأعضاء من قاعدة البيانات
    const serviceClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    
    const { data: members, error: membersError } = await serviceClient
      .from('members')
      .select('id, push_subscription')
      .in('id', validIds)
      .not('push_subscription', 'is', 'null');
      
    if (membersError || !members) return reply({ error: 'خطأ في جلب الاشتراكات.' }, 500);
    if (members.length === 0) return reply({ sent: 0, failed: 0, message: 'لا يوجد أعضاء لديهم تطبيق منزّل واشتراكات مفعّلة.' });
    
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || '/wasla-logo.png',
      url: url || '/portal',
    });
    
    let sent = 0;
    let failed = 0;
    
    for (const member of members) {
      try {
        await webpush.sendNotification(member.push_subscription, payload);
        sent++;
      } catch (err: unknown) {
        failed++;
        console.error(`فشل إرسال إشعار للعضو ${member.id}:`, err);
        // (Optional: remove subscription from DB if err.statusCode === 410 (Gone))
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await serviceClient.from('members').update({ push_subscription: null }).eq('id', member.id);
        }
      }
    }
    
    return reply({ sent, failed });
    
  } catch (err: unknown) {
    console.error('Push Notification Error:', err);
    return reply({ error: 'حدث خطأ غير متوقع.' }, 500);
  }
});