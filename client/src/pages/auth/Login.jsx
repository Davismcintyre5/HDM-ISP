import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      toast.success('Signed in');
      navigate(from, { replace: true });
    } catch (err) {
      const e = errors.fromAxios(err);
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card padding="lg">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Sign in</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Welcome back. Enter your credentials to continue.
        </p>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
        />
        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
          />
          <div className="flex items-center justify-between mt-1">
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              {showPassword ? 'Hide' : 'Show'} password
            </button>
            <Link
              to="/forgot-password"
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" fullWidth loading={submitting}>
          Sign in
        </Button>
      </form>

      <p className="mt-5 text-sm text-center text-slate-600 dark:text-slate-400">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand-600 dark:text-brand-400 hover:underline">
          Create one
        </Link>
      </p>
    </Card>
  );
}