import { useState } from 'react';
import { Mail, Phone, Globe, MapPin } from 'lucide-react';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { useToast } from '../../context/ToastContext';
import { useSite } from '../../context/SiteContext';
import { formatPhone } from '../../utils/format';

const FALLBACK = {
  email: 'support@hdm.co.ke',
  phone: '254768784909',
  website: 'https://hdm.co.ke',
};

export default function Contact() {
  const { toast } = useToast();
  const { siteSettings } = useSite();

  const supportEmail = siteSettings?.['support.email'] || FALLBACK.email;
  const supportPhone = siteSettings?.['support.phone'] || FALLBACK.phone;
  const supportWebsite = siteSettings?.['support.website'] || FALLBACK.website;

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Message sent', { message: 'Our team will be in touch shortly.' });
      setForm({ name: '', email: '', subject: '', message: '' });
    }, 400);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <PageHeader
        title="Contact us"
        description="Questions, demos, or support — we're here to help."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card padding="lg">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Your name"
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
                <Input
                  label="Email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                />
              </div>
              <Input
                label="Subject"
                required
                value={form.subject}
                onChange={(e) => update('subject', e.target.value)}
              />
              <Textarea
                label="Message"
                required
                rows={6}
                value={form.message}
                onChange={(e) => update('message', e.target.value)}
              />
              <div className="flex justify-end">
                <Button type="submit" loading={submitting}>
                  Send message
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          <Card padding="md">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Email</div>
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-sm text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 break-all"
                >
                  {supportEmail}
                </a>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Phone</div>
                <a
                  href={`tel:+${supportPhone.replace(/\D/g, '')}`}
                  className="text-sm text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400"
                >
                  {formatPhone(supportPhone)}
                </a>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Website</div>
                <a
                  href={supportWebsite}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 break-all"
                >
                  {supportWebsite.replace(/^https?:\/\//, '')}
                </a>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Office</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">Nairobi, Kenya</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}