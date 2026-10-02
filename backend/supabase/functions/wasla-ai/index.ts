import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// لتقييد CORS في الإنتاج: اضبط WASLA_ALLOWED_ORIGINS في أسرار الـ Edge Function
// بصيغة: https://wasla.vercel.app,http://localhost:5173
const allowedOrigin = Deno.env.get('WASLA_ALLOWED_ORIGINS') ?? '*'

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { question, context } = await req.json()
    
    // Create Supabase Client to fetch the API Key from Vault
    const authHeader = req.headers.get('Authorization')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    )

    // Ensure user has access
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized Access")

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
      return new Response(JSON.stringify({ error: 'لم يتم العثور على مفتاح AI API. يرجى إعداده في إعدادات Supabase.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const systemPrompt = `أنت "مساعد وصلة الذكي"، خبير في إدارة فريق "وصلة" وتحليل أدائهم وجاهزيتهم.
أمامك سياق حي لبيانات الأعضاء، المهام، الملاحظات، والإحصائيات.

تعليماتك الصارمة:
1. الرد باللغة العربية بأسلوب احترافي وعملي.
2. إذا كان السؤال عن إحصائيات عامة، لخصها من سياق البيانات أمامك مدعومة بالأرقام المتوفرة.
3. إذا كان المستخدم يطلب تسجيل، إضافة، أو تدمير، أو تعديل حالة مهمة، قم بإصدار إجراء Action JSON بصيغة صالحة داخل ردك بالإضافة للنص العادي.

أنواع الأكشنات المدعومة:
- لتعديل عضو (إذا ذُكر اسمه): \`\`\`json { "action": { "type": "update_member", "name": "اسم الشخص", "patch": {"hasLaptop": false, "canGoAlexandria": true} } } \`\`\`
- لحذف/تدمير عضو: \`\`\`json { "action": { "type": "delete_member", "name": "اسم الشخص" } } \`\`\`
- لإضافة ملاحظة: \`\`\`json { "action": { "type": "add_note", "text": "نص الملاحظة", "targetName": "اسم المستهدف إن وُجد" } } \`\`\`

السياق المتوفر:
${context}`;

    let reply = ''
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
    let cleanReply = reply.replace(/```json\s*(\{[\s\S]*?\})\s*```/g, '').trim()

    return new Response(JSON.stringify({ answer: cleanReply, action }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})