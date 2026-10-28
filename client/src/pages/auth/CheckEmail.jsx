import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MailCheck, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { resendVerification } from '../../api/auth';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';

export default function CheckEmail() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const { toast } = useToast();

  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  async function resend() {
    if (!email) {
      toast.error('Missing email', { message: 'Please return to the register page.' });
      return;
    }
    setSending(true);
    try {
      await resendVerification(email);
      toast.success('Email sent', { message: 'Check your inbox again.' });
      setCooldown(60);
      const id = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(id);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card padding="lg" className="text-center">
      <MailCheck className="h-12 w-12 mx-auto text-brand-600 dark:text-brand-400" />

      <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
        Verify your email
      </h1>

      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        We've sent a verification link to
        {email ? (
          <>
            {' '}
            <span className="font-medium text-slate-900 dark:text-slate-100 break-all">
              {email}
            </span>
          </>
        ) : (
          ' your email'
        )}
        . Click the link in that email to activate your account and start your free trial.
      </p>

      <div className="mt-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-left text-xs text-slate-600 dark:text-slate-300">
        <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Next steps</div>
        <ol className="list-decimal pl-4 space-y-1">
          <li>Open the email from us.</li>
          <li>Click the verification link.</li>
          <li>Sign in with your email and password — your account is active immediately.</li>
        </ol>
      </div>

      <div className="mt-5 space-y-2">
        <Button
          variant="secondary"
          fullWidth
          loading={sending}
          disabled={cooldown > 0}
          onClick={resend}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
        </Button>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Didn't get the email? Check your spam folder or try a different email address.
        </p>
      </div>

      <p className="mt-5 text-sm text-slate-600 dark:text-slate-400">
        <Link to="/login" className="text-brand-600 dark:text-brand-400 hover:underline">
          Back to sign in
        </Link>
        {' · '}
        <Link to="/register" className="text-brand-600 dark:text-brand-400 hover:underline">
          Use a different email
        </Link>
      </p>
    </Card>
  );
}