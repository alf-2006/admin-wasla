import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// لتقييد CORS في الإنتاج: اضبط WASLA_ALLOWED_ORIGINS في أسرار الـ Edge Function
// بصيغة: https://wasla.vercel.app,http://localhost:5173
// غياب القائمة يعني رفض أي Origin متصفح — لا wildcard مع بيانات موثقة.
const allowedOrigins = (Deno.env.get('WASLA_ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
})

const jsonReply = (body: unknown, status: number, origin: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })

serve(async (req) => {
  const origin = req.headers.get('Origin') ?? ''
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 })
  }
  const replyOrigin = origin || allowedOrigins[0] || 'null'
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(replyOrigin) })
  }
  if (req.method !== 'POST') {
    return jsonReply({ error: 'Method not allowed' }, 405, replyOrigin)
  }

  try {
    const parsed = await req.json().catch(() => null) as { question?: unknown; context?: unknown; history?: unknown } | null
    const question = typeof parsed?.question === 'string' ? parsed.question.slice(0, 4000) : ''
    const context = typeof parsed?.context === 'string' ? parsed.context.slice(0, 20000) : ''
    const history = Array.isArray(parsed?.history) ? (parsed.history as unknown[]).slice(0, 20) : []
    if (!question.trim()) {
      return jsonReply({ error: 'السؤال مطلوب.' }, 400, replyOrigin)
    }
    
    // Create Supabase Client to fetch the API Key from Vault
    const authHeader = req.headers.get('Authorization')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    )

    // Ensure user has access
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    // Admin-only check: env allowlist first, else database admin_emails via is_admin().
    const allowed = (Deno.env.get('WASLA_AI_ADMIN_EMAILS') ?? Deno.env.get('WHATSAPP_ADMIN_EMAILS') ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)

    if (allowed.length > 0) {
      const email = user.email?.toLowerCase()
      if (!email || !allowed.includes(email)) {
        return jsonReply({ error: 'غير مخول' }, 403, replyOrigin)
      }
    } else {
      const { data: isAdmin } = await supabaseClient.rpc('is_admin')
      if (isAdmin !== true) {
        return jsonReply({ error: 'غير مخول' }, 403, replyOrigin)
      }
    }

    // Fetch API key from Supabase Vault (RPC function we defined) or environment
    // ملاحظة أمنية: دالة get_groq_key_from_vault صارت قاصرة على service_role
    // (راجع backend/migrations/0001_security_hardening.sql) لذلك نستخدم عميلاً
    // خدمياً هنا — عدّلنا السابق كان يمرر توكن المستخدم وكان يعمل بالصدفة لأن
    // الدالة كانت متاحة للجميع، وهو الباب الذي أغلقناه.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const { data: secrets } = await adminClient.rpc('get_groq_key_from_vault')
    const apiKey = secrets || Deno.env.get('GROQ_API_KEY') || Deno.env.get('GEMINI_API_KEY')
    
    if (!apiKey) {
      return jsonReply({ error: 'لم يتم العثور على مفتاح AI API.' }, 400, replyOrigin)
    }

    const systemPrompt = `أنت "مساعد وصلة الذكي"، خبير في إدارة فريق "وصلة" وتحليل أدائهم وجاهزيتهم.
أمامك سياق حي لبيانات الأعضاء، المهام، الملاحظات، والإحصائيات.

تعليماتك الصارمة:
1. الرد باللغة العربية بأسلوب احترافي وعملي.
2. إذا كان السؤال عن إحصائيات عامة، لخصها من سياق البيانات أمامك مدعومة بالأرقام المتوفرة.
3. إذا كان المستخدم يطلب تسجيل، إضافة، أو تدمير، أو تعديل حالة مهمة، قم بإصدار إجراء Action JSON بصيغة صالحة داخل ردك بالإضافة للنص العادي.

أنواع الأكشنات المدعومة:
- لتعديل عضو: \`\`\`json { "action": { "type": "update_member", "name": "اسم الشخص", "patch": {"phone": "...", "device": "لابتوب"} } } \`\`\`
- لإنشاء عضو: \`\`\`json { "action": { "type": "create_member", "payload": {"full_name": "الاسم", "email": "البريد", "device": "لابتوب"} } } \`\`\`
- لحذف عضو: \`\`\`json { "action": { "type": "delete_member", "name": "اسم الشخص" } } \`\`\`
- لإنشاء مهمة: \`\`\`json { "action": { "type": "create_task", "payload": {"title": "العنوان", "description": "الوصف", "deadline_date": "2024-12-31", "assigned_to": ["الاسم الأول"]} } } \`\`\`
- لحذف مهمة: \`\`\`json { "action": { "type": "delete_task", "title": "عنوان المهمة" } } \`\`\`
- لإضافة ملاحظة: \`\`\`json { "action": { "type": "add_note", "payload": {"text": "نص الملاحظة", "targetName": "الاسم"} } } \`\`\`
- لحذف ملاحظة: \`\`\`json { "action": { "type": "delete_note", "id": "رقم الملاحظة" } } \`\`\`

السياق المتوفر:
${context}`;

    let reply = ''
    const historyMessages = (history as { role?: unknown; parts?: unknown }[])
      .filter((turn) => turn && (turn.role === 'user' || turn.role === 'assistant') && Array.isArray(turn.parts))
      .slice(0, 20)
      .map((turn) => ({
        role: turn.role as 'user' | 'assistant',
        content: (turn.parts as { text?: unknown }[]).map((part) => String(part.text ?? '')).join('\n').slice(0, 2000),
      }))
      .filter((turn) => turn.content.trim() !== '')
    if (apiKey.startsWith('gsk_') || Deno.env.get('GROQ_API_KEY')) {
      // Use Groq API (OpenAI compatible)
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            ...historyMessages,
            { role: 'user', content: question },
          ],
          temperature: 0.2,
        }),
      })

      const aiRes = await res.json()
      if (!res.ok) throw new Error(aiRes.error?.message || 'Groq AI error')
      reply = aiRes.choices?.[0]?.message?.content || ''
    } else {
      // Use Gemini API
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: question }] }],
          generationConfig: { temperature: 0.1 },
        }),
      })

      const aiRes = await res.json()
      if (!res.ok) throw new Error(aiRes.error?.message || 'Google AI error')
      reply = aiRes.candidates?.[0]?.content?.parts?.[0]?.text || ''
    }
    
    // Extract potential JSON action from the markdown block
    let action = null
    const actionMatch = reply.match(/```json\s*(\{[\s\S]*?\})\s*```/)
    if (actionMatch) {
      try {
        const parsed = JSON.parse(actionMatch[1])
        if (parsed.action) action = parsed.action
      } catch(e) {}
    }
    
    // Clean reply from JSON block to show nice text to the user
    let cleanReply = reply.replace(/```json\s*(\{[\s\S]*?\})\s*```/g, '').trim().slice(0, 8000)

    return jsonReply({ answer: cleanReply, action }, 200, replyOrigin)

  } catch (_error) {
    return jsonReply({ error: 'تعذر معالجة الطلب حالياً.' }, 400, replyOrigin)
  }
})