// =====================================================
// أنواع بيانات قاعدة بيانات وصلة (Supabase / PostgreSQL)
// المصدر: supabase_setup.sql — MUST يطابق السكيما دائماً
// =====================================================

export type Member = {
  id: number;
  created_at: string;
  email: string;
  full_name: string;
  completion_rank: number | null;
  /** ملاحظات الإدارة الخاصة بالعضو — ليست فرقاً، النظام كله وصلة واحدة */
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
  session_token?: string | null;
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
  target_member_id: number | null;
  target_name: string | null;
}

export type NoteInsert = Omit<Note, 'id' | 'created_at'>;

// ===== أنواع بيانات نظام الإعلامات =====
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';

export type AnnouncementTargetAudience = {
  type: 'all';
} | {
  type: 'specific';
  member_ids: number[];
};

export type Announcement = {
  id: number;
  created_at: string;
  title: string;
  content: string;
  target_audience: AnnouncementTargetAudience;
  priority: AnnouncementPriority;
  send_push: boolean;
  send_whatsapp: boolean;
  whatsapp_sent_at: string | null;
  whatsapp_sent_count: number;
  whatsapp_errors: any[];
  expires_at: string | null;
  is_active: boolean;
  created_by: string | null;
  read_receipts: Record<string, { read_at?: string; dismissed_at?: string }>;
};

export type AnnouncementInsert = Omit<Announcement, 'id' | 'created_at' | 'read_receipts' | 'whatsapp_sent_at' | 'whatsapp_sent_count' | 'whatsapp_errors'>;

export type MemberAnnouncement = {
  id: number;
  created_at: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  is_read: boolean;
  is_dismissed: boolean;
};

export type AnnouncementStats = {
  total_recipients: number;
  read_count: number;
  dismissed_count: number;
  pending_count: number;
  viewed_count: number;
};

/** صف تفصيلي لعضو واحد داخل تقرير إعلان (للإدارة فقط — بلا أعمدة حساسة) */
export type AnnouncementMemberDetail = {
  member_id: number;
  full_name: string;
  email: string;
  viewed_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
  read_at: string | null;
  dismissed_at: string | null;
};

/** نتيجة دالة تسجيل دخول العضو (RPC محصورة بالأعمدة العامة فقط — بلا session_token) */
export type MemberLookupRow = Pick<
  Member,
  'id' | 'created_at' | 'email' | 'full_name' | 'completion_rank' | 'bio' | 'device' | 'meeting_attendance' | 'work_status' | 'can_go_alexandria'
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
      announcements: { Row: Announcement; Insert: AnnouncementInsert; Update: Partial<AnnouncementInsert>; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      lookup_member_by_email: { Args: { p_email: string; p_device_token?: string | null }; Returns: MemberLookupRow[] };
      logout_member_device: { Args: { p_member_id: number; p_device_token?: string | null }; Returns: boolean };
      submit_task_status: {
        Args: { p_task_id: number; p_member_id: number; p_device_token?: string | null; p_status?: string; p_note?: string; p_submission_url?: string };
        Returns: unknown;
      };
      update_member_readiness: { Args: { p_member_id: number; p_device_token: string; p_can_go: boolean }; Returns: boolean };
      approve_task_submission: { Args: { p_task_id: number; p_member_id: number; p_bonus?: number }; Returns: ApproveTaskResult };
      save_push_subscription: { Args: { p_member_id: number; p_email: string; p_subscription: Record<string, any>; p_device_token?: string | null }; Returns: boolean };
      get_member_announcements: { Args: { p_member_id: number; p_device_token?: string | null }; Returns: MemberAnnouncement[] };
      mark_announcement_viewed: { Args: { p_announcement_id: number; p_member_id: number; p_device_token?: string | null }; Returns: boolean };
      mark_announcement_read: { Args: { p_announcement_id: number; p_member_id: number; p_device_token?: string | null }; Returns: boolean };
      dismiss_announcement: { Args: { p_announcement_id: number; p_member_id: number; p_device_token?: string | null }; Returns: boolean };
      get_announcement_details: { Args: { p_announcement_id: number }; Returns: AnnouncementMemberDetail[] };
      get_announcement_stats: { Args: { p_announcement_id: number }; Returns: AnnouncementStats[] };
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
  announcements: 'announcements',
} as const;
