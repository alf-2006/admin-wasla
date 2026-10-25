import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase/client';
import { toAppError } from '../../lib/supabase/errors';
import { TABLES } from '../../types/db';
import { parseNoteBonus } from '../notes/noteBonus';

/**
 * إجمالي بونص العضو = مجموع علامات [B:±n] في الملاحظات الموجهة إليه —
 * نفس الحساب الذي يعتمده ترتيب الفريق، فلا يختلف الرقم بين البوابة ولوحة الإدارة.
 */
export function useMemberBonus(memberId: number | null | undefined) {
  const enabled = typeof memberId === 'number' && memberId > 0;
  return useQuery({
    queryKey: ['member-bonus', memberId],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLES.notes)
        .select('text')
        .eq('target_member_id', memberId as number)
        .limit(2000);
      if (error) throw toAppError(error, 'معرفناش نحمّل رصيد البونص.');
      return ((data ?? []) as Array<{ text: string | null }>).reduce((sum, row) => sum + (parseNoteBonus(row.text).bonus ?? 0), 0);
    },
  });
}
