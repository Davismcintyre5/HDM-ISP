import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { resetPassword } from '../../api/auth';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, form.password);
      setSuccess(true);
      toast.success('Password updated', { message: 'You can now sign in with your new password.' });
      setTimeout(() => navigate('/login', { replace: true }), 1200);
    } catch (err) {
      setError(errors.fromAxios(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <Card padding="lg" className="text-center">
        <XCircle className="h-10 w-10 mx-auto text-red-600 dark:text-red-400" />
        <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Invalid reset link
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          This link is missing a reset token. Request a new one.
        </p>
        <div className="mt-5">
          <Link to="/forgot-password">
            <Button>Request new link</Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (success) {
    return (
      <Card padding="lg" className="text-center">
        <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 dark:text-green-400" />
        <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Password updated
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Redirecting to sign in…
        </p>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Set new password</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Choose a strong password you haven't used before.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="New password"
          type="password"
          required
          autoComplete="new-password"
          hint="At least 8 characters"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
        />
        <Input
          label="Confirm new password"
          type="password"
          required
          autoComplete="new-password"
          value={form.confirm}
          onChange={(e) => update('confirm', e.target.value)}
        />
        <Button type="submit" fullWidth loading={submitting}>
          Update password
        </Button>
      </form>

      <p className="mt-5 text-sm text-center text-slate-600 dark:text-slate-400">
        <Link to="/login" className="text-brand-600 dark:text-brand-400 hover:underline">
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}