import { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  Smartphone,
  Building2,
  Globe,
  Zap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import {
  getMpesaSettings,
  updateMpesaSettings,
  testMpesaSettings,
} from '../../api/mpesa';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';

const MODES = [
  {
    value: 'global',
    label: 'Use platform M-Pesa',
    description:
      'Customers pay to the HDM platform paybill. Fastest to set up, no M-Pesa credentials needed.',
    icon: Globe,
  },
  {
    value: 'shared',
    label: 'Use my paybill / till with platform credentials',
    description:
      'Customers pay to your shortcode. Uses the platform M-Pesa app; you only supply your shortcode or till.',
    icon: Building2,
  },
  {
    value: 'own',
    label: 'Use my own M-Pesa app',
    description:
      'You bring your own consumer key, secret, and passkey. Full control, full responsibility.',
    icon: Smartphone,
  },
];

const TRANSACTION_TYPES = [
  { value: 'CustomerBuyGoodsOnline', label: 'Buy Goods (Till)' },
  { value: 'CustomerPayBillOnline', label: 'Pay Bill (Shortcode)' },
];

const EMPTY_FORM = {
  mode: 'global',
  consumerKey: '',
  consumerSecret: '',
  passkey: '',
  shortcode: '',
  tillNumber: '',
  transactionType: 'CustomerBuyGoodsOnline',
};

export default function MpesaSettings() {
  const { toast } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [server, setServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const { data } = await getMpesaSettings();
      const s = data.data;
      setServer(s);
      setForm({
        mode: s.mode || 'global',
        consumerKey: s.fields?.consumerKey || '',
        consumerSecret: '',
        passkey: '',
        shortcode: s.fields?.shortcode || '',
        tillNumber: s.fields?.tillNumber || '',
        transactionType: s.fields?.transactionType || 'CustomerBuyGoodsOnline',
      });
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setTestResult(null);
  }

  function buildPayload() {
    const base = { mode: form.mode };

    if (form.mode === 'global') return base;

    if (form.mode === 'shared') {
      return {
        ...base,
        shortcode: form.shortcode.trim(),
        tillNumber: form.tillNumber.trim(),
        transactionType: form.transactionType,
      };
    }

    return {
      ...base,
      consumerKey: form.consumerKey.trim(),
      consumerSecret: form.consumerSecret.trim(),
      passkey: form.passkey.trim(),
      shortcode: form.shortcode.trim(),
      tillNumber: form.tillNumber.trim(),
      transactionType: form.transactionType,
    };
  }

  async function save() {
    setSaving(true);
    try {
      const { data } = await updateMpesaSettings(buildPayload());
      const s = data.data;
      setServer(s);
      setForm({
        mode: s.mode,
        consumerKey: s.fields?.consumerKey || '',
        consumerSecret: '',
        passkey: '',
        shortcode: s.fields?.shortcode || '',
        tillNumber: s.fields?.tillNumber || '',
        transactionType: s.fields?.transactionType || 'CustomerBuyGoodsOnline',
      });
      toast.success('M-Pesa settings saved');
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await testMpesaSettings();
      setTestResult(data.data);
      if (data.data.ok) {
        toast.success('Connection OK');
      } else {
        toast.error(data.data.error || 'Test failed');
      }
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setTesting(false);
    }
  }

  const selectedMode = useMemo(
    () => MODES.find((m) => m.value === form.mode) || MODES[0],
    [form.mode]
  );

  const secretsStored = {
    consumerSecret: Boolean(server?.fields?.consumerSecretSet),
    passkey: Boolean(server?.fields?.passkeySet),
  };

  if (loading) {
    return (
      <div className="py-16 grid place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="M-Pesa settings"
        description="Choose how customers pay you through M-Pesa."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={load}
              disabled={loading}
            >
              Reload
            </Button>
            <Button size="sm" onClick={save} loading={saving}>
              Save changes
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <Card padding="md">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Payment mode
          </div>
          <div className="grid gap-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = form.mode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => update('mode', m.value)}
                  className={[
                    'text-left rounded-xl border p-3 transition',
                    isSelected
                      ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-900/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={[
                        'h-9 w-9 rounded-lg grid place-items-center shrink-0',
                        isSelected
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
                      ].join(' ')}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {m.label}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {m.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {form.mode === 'shared' && (
          <Card padding="md">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Your shortcode or till
            </div>
            <div className="space-y-3">
              <Select
                label="Transaction type"
                value={form.transactionType}
                onChange={(e) => update('transactionType', e.target.value)}
              >
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>

              {form.transactionType === 'CustomerBuyGoodsOnline' && (
                <Input
                  label="Till number"
                  value={form.tillNumber}
                  onChange={(e) => update('tillNumber', e.target.value)}
                  placeholder="123456"
                  hint="5 to 7 digits"
                />
              )}

              {form.transactionType === 'CustomerPayBillOnline' && (
                <Input
                  label="Paybill shortcode"
                  value={form.shortcode}
                  onChange={(e) => update('shortcode', e.target.value)}
                  placeholder="123456"
                  hint="5 to 7 digits"
                />
              )}

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-3 text-xs text-slate-600 dark:text-slate-300">
                Platform credentials are used to initiate STK push. Funds settle to{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  {form.tillNumber || form.shortcode || '—'}
                </strong>
                .
              </div>
            </div>
          </Card>
        )}

        {form.mode === 'own' && (
          <Card padding="md">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Your M-Pesa credentials
            </div>
            <div className="space-y-3">
              <Input
                label="Consumer key"
                value={form.consumerKey}
                onChange={(e) => update('consumerKey', e.target.value)}
                placeholder="From your Safaricom developer portal"
              />
              <Input
                label="Consumer secret"
                type="password"
                value={form.consumerSecret}
                onChange={(e) => update('consumerSecret', e.target.value)}
                placeholder={secretsStored.consumerSecret ? '•••••••• (saved)' : ''}
                hint={
                  secretsStored.consumerSecret
                    ? 'Leave blank to keep the saved value'
                    : 'Required'
                }
              />
              <Input
                label="Passkey"
                type="password"
                value={form.passkey}
                onChange={(e) => update('passkey', e.target.value)}
                placeholder={secretsStored.passkey ? '•••••••• (saved)' : ''}
                hint={
                  secretsStored.passkey ? 'Leave blank to keep the saved value' : 'Required'
                }
              />
              <Select
                label="Transaction type"
                value={form.transactionType}
                onChange={(e) => update('transactionType', e.target.value)}
              >
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>

              {form.transactionType === 'CustomerBuyGoodsOnline' && (
                <Input
                  label="Till number"
                  value={form.tillNumber}
                  onChange={(e) => update('tillNumber', e.target.value)}
                  placeholder="123456"
                  hint="5 to 7 digits"
                />
              )}

              {form.transactionType === 'CustomerPayBillOnline' && (
                <Input
                  label="Paybill shortcode"
                  value={form.shortcode}
                  onChange={(e) => update('shortcode', e.target.value)}
                  placeholder="123456"
                  hint="5 to 7 digits"
                />
              )}
            </div>
          </Card>
        )}

        <Card padding="md">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 grid place-items-center shrink-0">
              <Info className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Callback URL
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure this as the <strong>CallbackURL</strong> in your Safaricom M-Pesa
                portal if using your own credentials.
              </p>
              <div className="mt-2 font-mono text-xs text-slate-900 dark:text-slate-100 break-all p-2 rounded bg-slate-50 dark:bg-slate-800/60">
                {server?.callbackUrl || '—'}
              </div>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Test connection
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Verify your M-Pesa credentials by requesting a token from Safaricom.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Zap className="h-3.5 w-3.5" />}
              onClick={test}
              loading={testing}
              disabled={form.mode === 'global'}
            >
              Test
            </Button>
          </div>

          {testResult && (
            <div
              className={[
                'mt-3 p-3 rounded-lg border text-sm',
                testResult.ok
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900 text-green-800 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300',
              ].join(' ')}
            >
              <div className="flex items-start gap-2">
                {testResult.ok ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <div>
                  <div className="font-medium">
                    {testResult.ok ? 'Connection OK' : 'Test failed'}
                  </div>
                  {testResult.ok && testResult.tokenExpiresIn && (
                    <div className="text-xs mt-0.5">
                      Token valid for {testResult.tokenExpiresIn}s
                    </div>
                  )}
                  {!testResult.ok && testResult.error && (
                    <div className="text-xs mt-0.5">{testResult.error}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card padding="md">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Platform defaults
          </div>
          <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <span>Platform shortcode</span>
              <span className="font-mono">{server?.platformShortcode || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Platform till</span>
              <span className="font-mono">{server?.platformTill || '—'}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}