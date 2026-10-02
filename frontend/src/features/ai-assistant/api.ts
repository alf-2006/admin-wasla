// =====================================================
// Wasla AI — استدعاء حقيقي للـ Edge Function أوضح فشله.
// حُذف "المحلل المحلي" الذي كان يؤلف ردوداً كأنها من الـ AI
// عند فشل الاتصال (خادم غير متصل، انقطاع شبكة، إلخ) —
// التظاهر بالذكاء خطأ تشغيلي: المدير يظن أن الإجابة حقيقية ويتخذ
// قراراً بناءً على رد مُركَّب من مطابقة كلمات مفتاحية.
// =====================================================
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase/client';

export interface AiAction {
  type: 'create_task' | 'update_member' | 'add_note' | 'assign_task' | 'delete_member';
  payload: Record<string, unknown>;
  description?: string;
}

/** دور محادثة واحد موجه لدى الـ Edge Function */
export interface AiChatTurn {
  role: 'user' | 'assistant';
  parts: { text: string }[];
}

export interface AiMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  action?: AiAction | null;
  actionExecuted?: boolean;
}

export interface AskAiInput {
  question: string;
  context: string;
  history?: AiChatTurn[];
}

export interface AskAiResult {
  answer: string;
  action?: AiAction | null;
  error?: string;
}

export const useAskWaslaAi = () => {
  return useMutation({
    mutationFn: async ({ question, context, history }: AskAiInput): Promise<AskAiResult> => {
      let data: AskAiResult | null = null;
      let invokeError: Error | null = null;

      try {
        const res = await supabase.functions.invoke<AskAiResult>('wasla-ai', {
          body: { question, context, history },
        });
        invokeError = res.error ?? null;
        data = res.data ?? null;
      } catch (err) {
        invokeError = err instanceof Error ? err : new Error(String(err));
      }

      // الدالة قد تعيد 200 مع جسم { error } — عاملها كخطأ
      if (invokeError) {
        throw new Error(
          'تعذر الوصول إلى مساعد وصلة الذكي. تأكد من اتصالك بالإنترنت ووعمل الـ Edge Function، ثم أعد المحاولة.'
        );
      }
      if (!data || data.error) {
        throw new Error(data?.error || 'استجابة غير مفهومة من المساعد الذكي.');
      }
      return data;
    },
  });
};
