import { useEffect, useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Switch from '../../components/ui/Switch';
import Spinner from '../../components/ui/Spinner';
import { getSettings, bulkUpdateSettings } from '../../api/settings';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { sanitizePhone } from '../../utils/format';

const KNOWN_KEYS = [
  'branding.logoUrl',
  'branding.primaryColor',
  'branding.portalTitle',
  'support.phone',
  'support.email',
  'notifications.smsEnabled',
  'notifications.emailEnabled',
];

const DEFAULTS = {
  'branding.logoUrl': '',
  'branding.primaryColor': '#2563eb',
  'branding.portalTitle': '',
  'support.phone': '',
  'support.email': '',
  'notifications.smsEnabled': true,
  'notifications.emailEnabled': true,
};

export default function Settings() {
  const { toast } = useToast();
  const { refreshSiteSettings } = useSite();
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await getSettings();
      const merged = { ...DEFAULTS };
      for (const k of KNOWN_KEYS) {
        if (data.data[k] !== undefined) merged[k] = data.data[k];
      }
      setForm(merged);
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
  }

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload['support.phone']) {
        payload['support.phone'] = sanitizePhone(payload['support.phone']) || payload['support.phone'];
      }
      await bulkUpdateSettings(payload);
      toast.success('Settings saved');
      refreshSiteSettings();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setSaving(false);
    }
  }

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
        title="Settings"
        description="Branding, support contacts, and notification preferences."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={load}
            >
              Reload
            </Button>
            <Button
              size="sm"
              leftIcon={<Save className="h-4 w-4" />}
              onClick={save}
              loading={saving}
            >
              Save changes
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        <Card padding="md">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Branding
          </div>
          <div className="space-y-3">
            <Input
              label="Portal title"
              value={form['branding.portalTitle']}
              onChange={(e) => update('branding.portalTitle', e.target.value)}
              placeholder="HDM Technologies"
            />
            <Input
              label="Logo URL"
              value={form['branding.logoUrl']}
              onChange={(e) => update('branding.logoUrl', e.target.value)}
              placeholder="https://res.cloudinary.com/..."
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Primary color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form['branding.primaryColor'] || '#2563eb'}
                  onChange={(e) => update('branding.primaryColor', e.target.value)}
                  className="h-10 w-14 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer"
                />
                <input
                  type="text"
                  value={form['branding.primaryColor']}
                  onChange={(e) => update('branding.primaryColor', e.target.value)}
                  placeholder="#2563eb"
                  className="flex-1 h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Support
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Support email"
              type="email"
              value={form['support.email']}
              onChange={(e) => update('support.email', e.target.value)}
              placeholder="support@example.com"
            />
            <Input
              label="Support phone"
              type="tel"
              value={form['support.phone']}
              onChange={(e) => update('support.phone', e.target.value)}
              placeholder="0712 345 678"
              hint="Supported: 0712 345 678, 254712345678, or +254 712 345 678"
            />
          </div>
        </Card>

        <Card padding="md">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Notifications
          </div>
          <div className="space-y-3">
            <Switch
              checked={!!form['notifications.smsEnabled']}
              onChange={(v) => update('notifications.smsEnabled', v)}
              label="Send SMS to customers"
            />
            <Switch
              checked={!!form['notifications.emailEnabled']}
              onChange={(v) => update('notifications.emailEnabled', v)}
              label="Send emails to customers"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}