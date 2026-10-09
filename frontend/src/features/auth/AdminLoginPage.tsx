import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { AuthShell } from '../../components/layout/AuthShell';
import { useAuthStore, getAdminRemember, setAdminRemember } from '../../store/auth';
import { supabase, syncAdminSessionStorage } from '../../lib/supabase/client';
import { isValidEmail } from '../../lib/validators';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState<boolean>(() => getAdminRemember());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setSession = useAuthStore((state) => state.setSession);
  const setMockSession = useAuthStore((state) => state.setMockSession);
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError('صيغة البريد الإلكتروني غير صحيحة. مثال: admin@wasla.com');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور قصيرة جداً — يجب أن تكون 6 أحرف على الأقل.');
      return;
    }
    setLoading(true);
    setError('');
    // ثبّت اختيار الحفظ قبل تسجيل الدخول حتى يكتبه Supabase في المخزن الصحيح.
    // ملاحظة: تنظيف المخزن المقابل يتم بعد نجاح الدخول فقط — حتى لا تضيع
    // جلسة صالحة قديمة عند فشل محاولة دخول جديدة.
    setAdminRemember(remember);
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (loginError) setError('بيانات الدخول غير صحيحة. يرجى التحقق من البريد وكلمة المرور.');
      else if (data.session) {
        syncAdminSessionStorage(remember);
        setSession(data.session);
        navigate('/admin/dashboard');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  };

  const mockLogin = () => {
    setMockSession(email || 'admin@wasla.com');
    navigate('/admin/dashboard');
  };

  return (
    <AuthShell
      audience="admin"
      badge="منطقة المسؤولين المعتمدين"
      title="تسجيل دخول الإدارة"
      description="أدخل بياناتك للوصول إلى مركز إدارة الفريق."
      footer={<Link to="/login" className="auth-inline-link"><span>بوابة الأعضاء</span><ArrowLeft size={16} /></Link>}
    >
      {error && <div className="auth-error" role="alert"><AlertCircle size={18} aria-hidden="true" /><span>{error}</span></div>}
      <form onSubmit={handleLogin} method="post" className="auth-form" noValidate>
        <label className="auth-field" htmlFor="admin-email">البريد الإلكتروني
          <span className="auth-input-wrap"><input id="admin-email" type="email" dir="ltr" autoComplete="username" required placeholder="admin@wasla.com" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError(''); }} aria-invalid={Boolean(error) || undefined} /></span>
        </label>
        {email.trim() && !isValidEmail(email.trim().toLowerCase()) && <p className="text-xs font-bold text-amber-700 dark:text-amber-300" role="note">تحقق من الصيغة: يجب أن يحتوي على @ ونطاق صحيح.</p>}
        <label className="auth-field" htmlFor="admin-password">كلمة المرور
          <span className="auth-input-wrap">
            <input id="admin-password" type={showPassword ? 'text' : 'password'} dir="ltr" autoComplete="current-password" required minLength={6} placeholder="••••••••" value={password} onChange={(event) => { setPassword(event.target.value); if (error) setError(''); }} />
            <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} aria-pressed={showPassword}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        <label className="auth-remember" htmlFor="admin-remember">
          <input
            id="admin-remember"
            type="checkbox"
            checked={remember}
            onChange={(event) => {
              const next = event.target.checked;
              setRemember(next);
              setAdminRemember(next);
            }}
          />
          <span className="auth-remember-box" aria-hidden="true" />
          <span>حفظ تسجيل الدخول على هذا الجهاز</span>
        </label>
        <button type="submit" className="auth-submit" disabled={loading} aria-busy={loading || undefined}>
          {loading ? 'جاري التحقق من الصلاحيات...' : 'دخول مركز الإدارة'}
          {!loading && <ArrowLeft size={18} aria-hidden="true" />}
        </button>
      </form>
      {import.meta.env.DEV && <button type="button" onClick={mockLogin} className="auth-inline-link auth-demo"><span>دخول تجريبي للمعاينة</span></button>}
    </AuthShell>
  );
}
