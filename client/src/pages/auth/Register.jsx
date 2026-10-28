import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LegalModal from '../../components/public/LegalModal';
import { register } from '../../api/auth';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { sanitizePhone } from '../../utils/format';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    businessName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [agree, setAgree] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [legal, setLegal] = useState(null);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Your name is required';
    if (!form.businessName.trim()) e.businessName = 'Business name is required';
    if (!EMAIL_RE.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone || !sanitizePhone(form.phone))
      e.phone = 'Enter a valid Kenyan phone number';
    if (form.password.length < 8) e.password = 'At least 8 characters';
    return e;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setServerError(null);

    const fieldErrorsResult = validate();
    if (Object.keys(fieldErrorsResult).length) {
      setFieldErrors(fieldErrorsResult);
      return;
    }
    if (!agree) {
      setServerError('Please accept the Terms and Acceptable Use Policy.');
      return;
    }

    setSubmitting(true);
    try {
      const cleanEmail = form.email.trim().toLowerCase();
      const cleanPhone = sanitizePhone(form.phone);
      const res = await register({
        name: form.name.trim(),
        businessName: form.businessName.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        password: form.password,
      });
      const trialDays = res?.data?.data?.trialDays;
      toast.success('Account created', {
        message: trialDays
          ? `Check your email to verify. Your ${trialDays}-day trial starts as soon as you verify.`
          : 'Check your email to verify your account.',
      });
      navigate(`/check-email?email=${encodeURIComponent(cleanEmail)}`, { replace: true });
    } catch (err) {
      setServerError(errors.fromAxios(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card padding="lg">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Start your 14-day free trial. No card required.
          </p>
        </div>

        {serverError && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
            {serverError}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label="Your name"
            required
            autoComplete="name"
            value={form.name}
            error={fieldErrors.name}
            onChange={(e) => update('name', e.target.value)}
          />
          <Input
            label="Business name"
            required
            autoComplete="organization"
            value={form.businessName}
            error={fieldErrors.businessName}
            onChange={(e) => update('businessName', e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            error={fieldErrors.email}
            onChange={(e) => update('email', e.target.value)}
          />
          <Input
            label="Phone"
            type="tel"
            required
            placeholder="0712 345 678"
            hint="Supported: 0712 345 678, 254712345678, or +254 712 345 678"
            value={form.phone}
            error={fieldErrors.phone}
            onChange={(e) => update('phone', e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            hint="At least 8 characters"
            value={form.password}
            error={fieldErrors.password}
            onChange={(e) => update('password', e.target.value)}
          />

          <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500"
            />
            <span>
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setLegal('terms')}
                className="text-brand-600 dark:text-brand-400 hover:underline"
              >
                Terms of Service
              </button>{' '}
              and{' '}
              <button
                type="button"
                onClick={() => setLegal('aup')}
                className="text-brand-600 dark:text-brand-400 hover:underline"
              >
                Acceptable Use Policy
              </button>
              .
            </span>
          </label>

          <Button type="submit" fullWidth loading={submitting}>
            Create account
          </Button>
        </form>

        <p className="mt-5 text-sm text-center text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 dark:text-brand-400 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>

      <LegalModal open={!!legal} variant={legal || 'terms'} onClose={() => setLegal(null)} />
    </>
  );
}