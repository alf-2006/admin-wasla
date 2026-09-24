import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { question, context } = await req.json()
    
    // Create Supabase Client to fetch the Groq Key from Vault
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Ensure user has access
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error("Unauthorized Access")

    // Fetch API key from Supabase Vault (RPC function we defined)
    const { data: secrets } = await supabaseClient.rpc('get_groq_key_from_vault')
    const groqKey = secrets || Deno.env.get('GROQ_API_KEY')
    
    if (!groqKey) {
      return new Response(JSON.stringify({ error: 'لم يتم العثور على مفتاح Groq API. يرجى إعداده من لوحة التحكم.' }), {
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
- لتعديل عضو (إذا ذُكر اسمه): \`\`\`json { "action": { "type": "update_member", "name": "اسم الشخص", "patch": {"hasLaptop": false, ...} } } \`\`\`
- لحذف/تدمير عضو: \`\`\`json { "action": { "type": "delete_member", "name": "اسم الشخص" } } \`\`\`
- لإضافة ملاحظة: \`\`\`json { "action": { "type": "add_note", "text": "نص الملاحظة", "targetName": "اسم المستهدف إن وُجد" } } \`\`\`

السياق المتوفر:
${context}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192", // Use the preferred logic model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.1,
      })
    })

    const aiRes = await res.json()
    if (!res.ok) throw new Error(aiRes.error?.message || "Groq API error")

    const reply = aiRes.choices[0].message.content
    
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