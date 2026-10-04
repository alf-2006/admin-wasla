import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react';
import { AuthShell } from '../../components/layout/AuthShell';
import { useAuthStore } from '../../store/auth';
import { fetchMemberByEmail } from '../members/api';
import { isValidEmail } from '../../lib/validators';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setMember = useAuthStore((state) => state.setMember);
  const navigate = useNavigate();

  const handleMemberLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('يرجى كتابة البريد الإلكتروني الخاص بك.');
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setError('صيغة البريد الإلكتروني غير صحيحة. مثال: name@wasla.com');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const member = await fetchMemberByEmail(cleanEmail);
      if (!member) setError('هذا البريد الإلكتروني غير مسجل في فريق وصلة. يرجى مراجعة الإدارة.');
      else {
        setMember(member);
        navigate('/portal');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'حدث خطأ أثناء الاتصال. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      audience="member"
      badge="مساحة العمل والتكليفات"
      title="دخول أعضاء وصلة"
      description="اكتب بريدك الإلكتروني المسجل في الفريق للمتابعة."
      footer={<span className="text-sm text-[var(--text-2)]">هل تواجه مشكلة في الدخول؟ تواصل مع مسؤول فريقك.</span>}
    >
      {error && <div className="auth-error" role="alert"><AlertCircle size={18} aria-hidden="true" /><span>{error}</span></div>}
      <form onSubmit={handleMemberLogin} className="auth-form" noValidate>
        <label className="auth-field" htmlFor="member-email">البريد الإلكتروني للعضو
          <span className="auth-input-wrap"><Mail size={17} aria-hidden="true" /><input id="member-email" type="email" dir="ltr" autoComplete="email" required placeholder="name@wasla.com" value={email} onChange={(event) => { setEmail(event.target.value); if (error) setError(''); }} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? 'member-email-error' : undefined} /></span>
        </label>
        {email.trim() && !isValidEmail(email.trim().toLowerCase()) && <p className="text-xs font-bold text-amber-700 dark:text-amber-300" role="note">تحقق من الصيغة: يجب أن يحتوي على @ ونطاق صحيح.</p>}
        <button type="submit" className="auth-submit" disabled={loading} aria-busy={loading || undefined}>
          {loading ? 'جاري التحقق...' : 'دخول مساحة العمل'}
          {!loading && <ArrowLeft size={18} aria-hidden="true" />}
        </button>
      </form>
    </AuthShell>
  );
}
