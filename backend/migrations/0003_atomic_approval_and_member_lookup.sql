-- ========================================================
-- Migration 0003 — إغلاق تسريب بيانات الأعضاء + اعتماد ذرّي
--
-- المشكلتان:
--  1) سياسة "Anon members login lookup" تسمح بـ SELECT USING (true)
--     لكل الصفوف على members — أي حد عنده anon key يسحب قائمة
--     كل الأعضاء بأسمائهم وإيميلاتهم وفرقهم. الحل: منع SELECT
--     المباشر تماماً على anon، واستبداله بدالة SECURITY DEFINER
--     تُرجع صفاً واحداً بعد مطابقة بريد دقيق.
--  2) الاعتماد (approved + منح نقاط) كان عمليتين منفصلتين في
--     الـ Frontend (tasks ثم members) — فشل الثانية يترك العضو
--     بدون نقاط رغم اعتماد مهمته. الحل: RPC واحدة ذرّية.
-- ========================================================

-- ----------------------------------------------------------
-- 1) دالة تسجيل دخول العضو — بدل SELECT المباشر
--    تُرجع الأعمدة العامة فقط، لصف واحد، بمطابقة بريد تامة.
--    REVOKE من PUBLIC ثم GRANT لـ anon + authenticated.
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lookup_member_by_email(p_email text)
RETURNS TABLE (
    id BIGINT,
    created_at TIMESTAMPTZ,
    email TEXT,
    full_name TEXT,
    team TEXT,
    completion_rank INT,
    bio TEXT,
    device TEXT,
    meeting_attendance TEXT,
    work_status TEXT,
    can_go_alexandria BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT m.id, m.created_at, m.email, m.full_name, m.team,
           m.completion_rank, m.bio, m.device, m.meeting_attendance,
           m.work_status, m.can_go_alexandria
    FROM public.members m
    WHERE m.email = lower(btrim(p_email))
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_member_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_member_by_email(text) TO anon, authenticated;

-- ----------------------------------------------------------
-- 2) إغلاق SELECT المباشر على members عن anon
--    (بوابة الأعضاء ستستخدم الدالة أعلاه فقط)
-- ----------------------------------------------------------
DROP POLICY IF EXISTS "Anon members login lookup" ON public.members;
DROP POLICY IF EXISTS "Anon read members by email" ON public.members;

REVOKE SELECT ON public.members FROM anon;
-- ملاحظة: authenticated يحتفظ بـ SELECT الكامل عبر سياسة الإدارة.

-- ----------------------------------------------------------
-- 3) اعتماد ذرّي: تحديث tracking + منح نقاط في معاملة واحدة
--    service: الاعتماد بلا نقاط إضافية.
--    منع anon من استدعائها (الاعتماد حق إداري فقط).
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_task_submission(
    p_task_id BIGINT,
    p_member_id BIGINT,
    p_bonus INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_tracking JSONB;
    v_entry JSONB;
    v_new_rank INT;
BEGIN
    -- الاعتماد حق إداري: anon ممنوع نهائياً
    IF current_setting('role', true) = 'anon' THEN
        RAISE EXCEPTION 'ADMIN_APPROVAL_FORBIDDEN: الاعتماد حق إداري حصرياً.';
    END IF;

    SELECT tracking INTO v_tracking FROM public.tasks WHERE id = p_task_id FOR UPDATE;
    IF v_tracking IS NULL THEN
        RAISE EXCEPTION 'TASK_NOT_FOUND: المهمة غير موجودة.';
    END IF;

    v_entry := v_tracking -> p_member_id::text;
    IF v_entry IS NULL THEN
        RAISE EXCEPTION 'NOT_ASSIGNED: العضو غير مكلف بهذه المهمة.';
    END IF;

    -- تحديث الحالة إلى approved داخل نفس المعاملة
    v_tracking := jsonb_set(
        v_tracking,
        ARRAY[p_member_id::text, 'status'],
        to_jsonb('approved'::text)
    ) || jsonb_build_object('updated_at', to_jsonb(now()));

    UPDATE public.tasks SET tracking = v_tracking WHERE id = p_task_id;

    -- منح النقاط (bonus + 5 نقاط اعتماد أساسية، مقصوصة عند 100)
    IF p_bonus <> 0 OR TRUE THEN
        UPDATE public.members
        SET completion_rank = LEAST(100, COALESCE(completion_rank, 0) + 5 + GREATEST(0, p_bonus))
        WHERE id = p_member_id
        RETURNING completion_rank INTO v_new_rank;
    END IF;

    RETURN jsonb_build_object(
        'task_id', p_task_id,
        'member_id', p_member_id,
        'status', 'approved',
        'completion_rank', v_new_rank
    );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_task_submission(BIGINT, BIGINT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_task_submission(BIGINT, BIGINT, INT) TO authenticated;
