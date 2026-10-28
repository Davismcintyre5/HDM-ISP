import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { forgotPassword } from '../../api/auth';
import { errors } from '../../utils/errors';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(errors.fromAxios(err).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card padding="lg" className="text-center">
        <MailCheck className="h-10 w-10 mx-auto text-brand-600 dark:text-brand-400" />
        <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Check your email
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          If an account exists for <span className="font-medium">{email}</span>, we've sent a
          password reset link. The link expires in 30 minutes.
        </p>
        <div className="mt-5">
          <Link to="/login">
            <Button variant="secondary">Back to sign in</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Forgot password</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Enter your email and we'll send a reset link.
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
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" fullWidth loading={submitting}>
          Send reset link
        </Button>
      </form>

      <p className="mt-5 text-sm text-center text-slate-600 dark:text-slate-400">
        Remembered it?{' '}
        <Link to="/login" className="text-brand-600 dark:text-brand-400 hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}