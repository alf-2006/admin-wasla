import { supabase } from '../supabase/client';
import { toAppError } from '../supabase/errors';
import { getDeviceToken } from '../../store/auth';
import { isPositiveId } from '../validators';
import type {
  Announcement,
  AnnouncementInsert,
  MemberAnnouncement,
  AnnouncementMemberDetail,
  AnnouncementStats,
} from '../../types/db';
import type { AnnouncementTargetAudience } from '../../types/db';

export class AnnouncementsAPI {
  // ===== Admin APIs =====
  
  /**
   * إنشاء إعلان جديد (للإدارة فقط)
   */
  static async createAnnouncement(data: AnnouncementInsert): Promise<Announcement> {
    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw toAppError(error, 'فشل في إنشاء الإعلان.');
    }

    return announcement;
  }

  /**
   * جلب جميع الإعلامات (للإدارة فقط)
   */
  static async getAnnouncements(): Promise<Announcement[]> {
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw toAppError(error, 'فشل في جلب الإعلامات.');
    }

    return announcements || [];
  }

  /**
   * تحديث إعلان موجود (للإدارة فقط)
   */
  static async updateAnnouncement(
    id: number,
    data: Partial<AnnouncementInsert>
  ): Promise<Announcement> {
    const { data: announcement, error } = await supabase
      .from('announcements')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw toAppError(error, 'فشل في تحديث الإعلان.');
    }

    return announcement;
  }

  /**
   * حذف إعلان (للإدارة فقط)
   */
  static async deleteAnnouncement(id: number): Promise<void> {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      throw toAppError(error, 'فشل في حذف الإعلان.');
    }
  }

  /**
   * جلب إعلان واحد بالمعرف (للإدارة فقط) — يُستخدم لعرض حالة إرسال الواتساب.
   */
  static async getAnnouncementById(id: number): Promise<Announcement | null> {
    if (!isPositiveId(id)) {
      throw toAppError(new Error('INVALID_ID'), 'معرّف الإعلان غير صالح.');
    }
    const { data: announcement, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw toAppError(error, 'فشل في جلب الإعلان.');
    }

    return announcement ?? null;
  }

  /**
   * جلب إحصائيات الإعلان (للإدارة فقط)
   */
  static async getAnnouncementStats(announcementId: number): Promise<AnnouncementStats | null> {
    const { data: stats, error } = await supabase
      .rpc('get_announcement_stats', { p_announcement_id: announcementId });

    if (error) {
      throw toAppError(error, 'فشل في جلب إحصائيات الإعلان.');
    }

    return stats && stats.length > 0 ? stats[0] : null;
  }

  /**
   * جلب تفاصيل كل مستلم (للإدارة فقط): المشاهدة والقراءة والمسح لكل عضو.
   */
  static async getAnnouncementDetails(announcementId: number): Promise<AnnouncementMemberDetail[]> {
    if (!isPositiveId(announcementId)) {
      throw toAppError(new Error('INVALID_ID'), 'معرّف الإعلان غير صالح.');
    }
    const { data: details, error } = await supabase
      .rpc('get_announcement_details', { p_announcement_id: announcementId });

    if (error) {
      throw toAppError(error, 'فشل في جلب تفاصيل الإعلان.');
    }

    return details || [];
  }

  // ===== Member APIs =====

  /**
   * جلب إعلامات العضو المخصصة له فقط — برمز جهازه (منع BOLA).
   */
  static async getMemberAnnouncements(memberId: number): Promise<MemberAnnouncement[]> {
    if (!isPositiveId(memberId)) throw toAppError(new Error('INVALID_ID'), 'معرّف العضو غير صالح.');
    const { data: announcements, error } = await supabase
      .rpc('get_member_announcements', { p_member_id: memberId, p_device_token: getDeviceToken() });

    if (error) {
      throw toAppError(error, 'فشل في جلب إعلامات العضو.');
    }

    return announcements || [];
  }

  /**
   * تسجيل مشاهدة العضو للإعلان (تُستدعى عند ظهور الإعلان في بوابته —
   * حدث منفصل عن ضغط "تمت القراءة").
   */
  static async markAnnouncementViewed(
    announcementId: number,
    memberId: number
  ): Promise<boolean> {
    if (!isPositiveId(announcementId) || !isPositiveId(memberId)) {
      throw toAppError(new Error('INVALID_ID'), 'معرّفات الإعلان غير صالحة.');
    }
    const { data: result, error } = await supabase
      .rpc('mark_announcement_viewed', {
        p_announcement_id: announcementId,
        p_member_id: memberId,
        p_device_token: getDeviceToken(),
      });

    if (error) {
      throw toAppError(error, 'فشل في تسجيل المشاهدة.');
    }

    return result === true;
  }

  /**
   * تعليم الإعلان كمقروء (يبقى ظاهراً) — برمز الجهاز.
   */
  static async markAnnouncementRead(
    announcementId: number,
    memberId: number
  ): Promise<boolean> {
    if (!isPositiveId(announcementId) || !isPositiveId(memberId)) {
      throw toAppError(new Error('INVALID_ID'), 'معرّفات الإعلان غير صالحة.');
    }
    const { data: result, error } = await supabase
      .rpc('mark_announcement_read', {
        p_announcement_id: announcementId,
        p_member_id: memberId,
        p_device_token: getDeviceToken(),
      });

    if (error) {
      throw toAppError(error, 'فشل في تعليم الإعلان كمقروء.');
    }

    return result === true;
  }

  /**
   * مسح الإعلان (إخفاؤه نهائياً من بوابة العضو) — برمز الجهاز.
   */
  static async dismissAnnouncement(
    announcementId: number,
    memberId: number
  ): Promise<boolean> {
    if (!isPositiveId(announcementId) || !isPositiveId(memberId)) {
      throw toAppError(new Error('INVALID_ID'), 'معرّفات الإعلان غير صالحة.');
    }
    const { data: result, error } = await supabase
      .rpc('dismiss_announcement', {
        p_announcement_id: announcementId,
        p_member_id: memberId,
        p_device_token: getDeviceToken(),
      });

    if (error) {
      throw toAppError(error, 'فشل في مسح الإعلان.');
    }

    return result === true;
  }

  // ===== Utility Methods =====

  /**
   * جلب عدد الإعلامات غير المقروءة للعضو
   */
  static async getUnreadCount(memberId: number): Promise<number> {
    const announcements = await this.getMemberAnnouncements(memberId);
    return announcements.filter(ann => !ann.is_read).length;
  }

  /**
   * تحويل أولوية الإعلان إلى نص عربي
   */
  static getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: 'منخفضة',
      normal: 'عادية',
      high: 'عالية',
      urgent: 'عاجلة'
    };
    return labels[priority] || priority;
  }

  /**
   * تحويل نوع الجمهور إلى نص عربي
   */
  static getAudienceLabel(targetAudience: AnnouncementTargetAudience | null | undefined): string {
    if (targetAudience?.type === 'all') {
      return 'جميع الأعضاء';
    } else if (targetAudience?.type === 'specific') {
      const count = targetAudience.member_ids?.length || 0;
      return `${count} عضو محدد`;
    }
    return 'غير محدد';
  }
}

export default AnnouncementsAPI;