import { useEffect, useRef, useState } from 'react';
import { useAskWaslaAi, type AiAction, type AiMessage } from './api';
import { useCreateTask } from '../tasks/api';
import { useCreateNote } from '../notes/api';
import type { Member, Task } from '../../types/db';

export function useAiConversation(members: Member[], tasks: Task[]) {
  const ask = useAskWaslaAi();
  const createTask = useCreateTask();
  const createNote = useCreateNote();
  const [messages, setMessages] = useState<AiMessage[]>([{
    id: 'welcome',
    sender: 'assistant',
    text: 'أهلاً بك! أنا مساعد وصلة الذكي. اسألني عن الفريق والمهام أو اطلب مني إنشاء مهمة أو ملاحظة.',
    timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
  }]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildContext = () => JSON.stringify({
    metrics: {
      totalMembers: members.length,
      laptopCount: members.filter((member) => member.device?.includes('لابتوب')).length,
      alexandriaReadinessCount: members.filter((member) => member.can_go_alexandria).length,
      activeTasksCount: tasks.filter((task) => Object.values(task.tracking ?? {}).some((entry) => entry.status !== 'approved')).length,
    },
    members: members.slice(0, 50).map((member) => ({
      id: member.id, name: member.full_name, email: member.email, team: member.team,
      device: member.device, can_go_alexandria: member.can_go_alexandria,
    })),
    tasks: tasks.slice(0, 20).map((task) => ({ id: task.id, title: task.title, deadline: task.deadline_date, tracking: task.tracking })),
  });

  const sendMessage = async (value: string) => {
    const text = value.trim();
    if (!text || ask.isPending) return;
    const userMessage: AiMessage = {
      id: Date.now().toString(), sender: 'user', text,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((current) => [...current, userMessage]);
    try {
      const response = await ask.mutateAsync({ question: text, context: buildContext() });
      setMessages((current) => [...current, {
        id: (Date.now() + 1).toString(), sender: 'assistant', text: response.answer || 'تمت معالجة طلبك.',
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        action: response.action || null, actionExecuted: false,
      }]);
    } catch (cause) {
      setMessages((current) => [...current, {
        id: (Date.now() + 1).toString(), sender: 'assistant',
        text: `عذراً، حدث خطأ أثناء معالجة الطلب: ${cause instanceof Error ? cause.message : 'تعذر الوصول إلى المساعد الذكي.'}`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
  };

  const executeAction = async (messageId: string, action: AiAction) => {
    const payload = action.payload ?? {};
    const stringValue = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
    try {
      if (action.type === 'create_task') {
        const rawAssigned = payload.assigned_to;
        const assignedTo: string[] | string = Array.isArray(rawAssigned) ? rawAssigned.map(String) : stringValue(rawAssigned) ?? 'ALL';
        await createTask.mutateAsync({
          title: stringValue(payload.title) ?? 'مهمة جديدة من المساعد الذكي',
          description: stringValue(payload.description),
          has_deadline: Boolean(payload.deadline_date),
          deadline_date: stringValue(payload.deadline_date),
          assigned_to: assignedTo,
          tracking: {},
        });
      } else if (action.type === 'add_note') {
        await createNote.mutateAsync({
          text: stringValue(payload.text) ?? 'ملاحظة من مساعد وصلة الذكي (بدون نص).',
          author: 'مساعد وصلة الذكي (AI)', author_role: 'AI Assistant',
          date: new Date().toLocaleDateString('ar-EG', { dateStyle: 'medium' }),
          team: null, target_team: stringValue(payload.targetTeam), target_member_id: null,
          target_name: stringValue(payload.targetName),
        });
      } else {
        alert(`نوع الإجراء "${action.type}" غير مدعوم للتنفيذ التلقائي بعد — نفّذ التعديل يدوياً من صفحات الإدارة.`);
        return;
      }
      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, actionExecuted: true } : message));
      alert('تم تنفيذ الإجراء فعلياً في قاعدة البيانات.');
    } catch (cause) {
      alert(`فشل تنفيذ الإجراء: ${cause instanceof Error ? cause.message : 'خطأ غير معروف'} — لم يُكتب شيء في قاعدة البيانات.`);
    }
  };

  return { messages, messagesEndRef, isPending: ask.isPending, sendMessage, executeAction };
}
