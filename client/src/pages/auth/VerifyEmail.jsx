import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { verifyEmail } from '../../api/auth';
import { errors } from '../../utils/errors';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState('loading');
  const [message, setMessage] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!token) {
      setState('failure');
      setMessage('Missing verification token in URL.');
      return;
    }
    let cancelled = false;
    setState('loading');
    verifyEmail(token)
      .then((res) => {
        if (!cancelled) {
          setResult(res?.data?.data || null);
          setState('success');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState('failure');
          setMessage(errors.fromAxios(err).message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Card padding="lg" className="text-center">
      {state === 'loading' && (
        <>
          <Loader2 className="h-10 w-10 mx-auto text-brand-600 dark:text-brand-400 animate-spin" />
          <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Verifying your email…
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            This will only take a moment.
          </p>
        </>
      )}

      {state === 'success' && (
        <>
          <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 dark:text-green-400" />
          <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Email verified
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Your account is active and your 14-day free trial has started. Sign in to begin.
          </p>
          {result?.businessName && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Account: <span className="font-medium text-slate-700 dark:text-slate-200">{result.businessName}</span>
            </p>
          )}
          <div className="mt-5">
            <Link to="/login">
              <Button>Sign in now</Button>
            </Link>
          </div>
        </>
      )}

      {state === 'failure' && (
        <>
          <XCircle className="h-10 w-10 mx-auto text-red-600 dark:text-red-400" />
          <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Verification failed
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {message || 'The link may be invalid or expired.'}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link to="/register">
              <Button variant="secondary">Register again</Button>
            </Link>
            <Link to="/contact">
              <Button variant="ghost">Contact support</Button>
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}