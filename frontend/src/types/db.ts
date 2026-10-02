// =====================================================
// أنواع بيانات قاعدة بيانات وصلة (Supabase / PostgreSQL)
// المصدر: supabase_setup.sql — MUST يطابق السكيما دائماً
// =====================================================

export type Member = {
  id: number;
  created_at: string;
  email: string;
  full_name: string;
  team: string | null;
  completion_rank: number | null;
  team_notes: string | null;
  residence: string | null;
  work_conditions: string | null;
  bio: string | null;
  phone: string | null;
  device: string | null;
  gender: string | null;
  meeting_attendance: string | null;
  work_status: string | null;
  can_go_alexandria: boolean;
}

export type MemberInsert = Omit<Member, 'id' | 'created_at'>;
export type MemberUpdate = Partial<MemberInsert> & { id: Member['id'] };

export type TaskStatus = 'pending' | 'in_progress' | 'under_review' | 'approved' | 'revision_requested';

/** حالة تتبع عضو داخل مهمة */
export interface TaskTrackingEntry {
  status: TaskStatus;
  note?: string;
  submission_url?: string;
  updated_at?: string;
}

export type Task = {
  id: number;
  created_at: string;
  title: string;
  description: string | null;
  has_deadline: boolean;
  deadline_date: string | null;
  /** JSONB: مصفوفة أرقام أعضاء أو "ALL" */
  assigned_to: string[] | string | null;
  /** JSONB: { [memberId: string]: TaskTrackingEntry } */
  tracking: Record<string, TaskTrackingEntry> | null;
}

export type TaskInsert = Omit<Task, 'id' | 'created_at'>;
export type TaskUpdate = Partial<TaskInsert> & { id: Task['id'] };

export type Note = {
  id: number;
  created_at: string;
  text: string;
  author: string | null;
  author_role: string | null;
  date: string | null;
  team: string | null;
  target_team: string | null;
  target_member_id: number | null;
  target_name: string | null;
}

export type NoteInsert = Omit<Note, 'id' | 'created_at'>;

/** نتيجة دالة تسجيل دخول العضو (RPC محصورة بالأعمدة العامة فقط) */
export type MemberLookupRow = Pick<
  Member,
  'id' | 'created_at' | 'email' | 'full_name' | 'team' | 'completion_rank' | 'bio' | 'device' | 'meeting_attendance' | 'work_status' | 'can_go_alexandria'
>;

/** نتيجة دالة الاعتماد الذرّي */
export interface ApproveTaskResult {
  task_id: number;
  member_id: number;
  status: 'approved';
  completion_rank: number | null;
}

export interface Database {
  public: {
    Tables: {
      members: { Row: Member; Insert: MemberInsert; Update: Partial<MemberInsert>; Relationships: [] };
      tasks: { Row: Task; Insert: TaskInsert; Update: Partial<TaskInsert>; Relationships: [] };
      notes: { Row: Note; Insert: NoteInsert; Update: Partial<NoteInsert>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      lookup_member_by_email: { Args: { p_email: string }; Returns: MemberLookupRow[] };
      approve_task_submission: { Args: { p_task_id: number; p_member_id: number; p_bonus?: number }; Returns: ApproveTaskResult };
      save_push_subscription: { Args: { p_member_id: number; p_email: string; p_subscription: Record<string, any> }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ===== أسماء الجداول (مصدر واحد للحقيقة) =====
export const TABLES = {
  members: 'members',
  tasks: 'tasks',
  notes: 'notes',
} as const;
