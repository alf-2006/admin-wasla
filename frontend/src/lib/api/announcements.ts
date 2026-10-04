import { supabase } from '../supabase/client';
import { toAppError } from '../supabase/errors';
import type {
  Announcement,
  AnnouncementInsert,
  MemberAnnouncement,
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
      console.error('[AnnouncementsAPI] خطأ في إنشاء الإعلان:', error);
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
      console.error('[AnnouncementsAPI] خطأ في جلب الإعلامات:', error);
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
      console.error('[AnnouncementsAPI] خطأ في تحديث الإعلان:', error);
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
      console.error('[AnnouncementsAPI] خطأ في حذف الإعلان:', error);
      throw toAppError(error, 'فشل في حذف الإعلان.');
    }
  }

  /**
   * جلب إحصائيات الإعلان (للإدارة فقط)
   */
  static async getAnnouncementStats(announcementId: number): Promise<AnnouncementStats | null> {
    const { data: stats, error } = await supabase
      .rpc('get_announcement_stats', { p_announcement_id: announcementId });

    if (error) {
      console.error('[AnnouncementsAPI] خطأ في جلب إحصائيات الإعلان:', error);
      throw toAppError(error, 'فشل في جلب إحصائيات الإعلان.');
    }

    return stats && stats.length > 0 ? stats[0] : null;
  }

  // ===== Member APIs =====

  /**
   * جلب إعلامات العضو المخصصة له فقط
   */
  static async getMemberAnnouncements(memberId: number): Promise<MemberAnnouncement[]> {
    const { data: announcements, error } = await supabase
      .rpc('get_member_announcements', { p_member_id: memberId });

    if (error) {
      console.error('[AnnouncementsAPI] خطأ في جلب إعلامات العضو:', error);
      throw toAppError(error, 'فشل في جلب إعلامات العضو.');
    }

    return announcements || [];
  }

  /**
   * تعليم الإعلان كمقروء (يبقى ظاهراً)
   */
  static async markAnnouncementRead(
    announcementId: number,
    memberId: number
  ): Promise<boolean> {
    const { data: result, error } = await supabase
      .rpc('mark_announcement_read', {
        p_announcement_id: announcementId,
        p_member_id: memberId
      });

    if (error) {
      console.error('[AnnouncementsAPI] خطأ في تعليم الإعلان كمقروء:', error);
      throw toAppError(error, 'فشل في تعليم الإعلان كمقروء.');
    }

    return result === true;
  }

  /**
   * مسح الإعلان (إخفاؤه نهائياً من بوابة العضو)
   */
  static async dismissAnnouncement(
    announcementId: number,
    memberId: number
  ): Promise<boolean> {
    const { data: result, error } = await supabase
      .rpc('dismiss_announcement', {
        p_announcement_id: announcementId,
        p_member_id: memberId
      });

    if (error) {
      console.error('[AnnouncementsAPI] خطأ في مسح الإعلان:', error);
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