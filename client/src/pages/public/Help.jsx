import { Link } from 'react-router-dom';
import { BookOpen, Router, Ticket, Users, AlertTriangle, Mail, Phone, Globe } from 'lucide-react';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import { useSite } from '../../context/SiteContext';
import { formatPhone } from '../../utils/format';

const SECTIONS = [
  {
    id: 'quick-start',
    icon: BookOpen,
    title: 'Quick start',
    body: [
      'Register your provider account and verify your email.',
      'Wait for admin approval — you land on the Free Trial dashboard once approved.',
      'Add your MikroTik router: enter its IP, API port (default 8728), and credentials.',
      'Use "Test connection" to confirm the dashboard can reach the router.',
      'Create a plan (e.g. Daily 5Mbps at KES 50).',
      'Generate a batch of vouchers against that plan.',
      'Print the codes and hand them to customers.',
    ],
  },
  {
    id: 'router-setup',
    icon: Router,
    title: 'Router setup',
    body: [
      'Enable the API service on the router: IP → Services → api, port 8728.',
      'Create a dedicated API user with the "api" policy. Do not reuse your admin login.',
      'In HDM, add the router with its LAN IP (as reachable from the dashboard server) and the API user credentials.',
      'Enter a RADIUS secret — it must match IP → RADIUS → Secret on the router exactly.',
      'Save, then click "Test connection". A green result means the router is reachable.',
      'If it fails: check the port is open in the router firewall, the API service is enabled, and credentials match.',
    ],
  },
  {
    id: 'vouchers',
    icon: Ticket,
    title: 'Vouchers',
    body: [
      'Go to Vouchers → "Generate vouchers".',
      'Pick a plan, enter a count (1–1000), optionally set an expiry date and batch ID.',
      'The full list of codes appears once — copy, download CSV, or print before closing the modal.',
      'Each voucher is a single-use code. Once redeemed, it cannot be reused or revoked.',
      'To revoke unused vouchers: open the Vouchers list, filter by status "unused", and click Revoke on each.',
    ],
  },
  {
    id: 'customers',
    icon: Users,
    title: 'Customers',
    body: [
      'Customers are created automatically when a voucher is redeemed.',
      'You can also create customers manually — useful for MAC-locked or staff accounts.',
      'Suspending a customer disconnects them from the router immediately.',
      'Renewing a customer extends from the later of now or their current expiry — no time is wasted.',
    ],
  },
  {
    id: 'troubleshooting',
    icon: AlertTriangle,
    title: 'Troubleshooting',
    body: [
      'Router test fails: verify API service is enabled on the router, port 8728 is open, and the credentials match.',
      'Voucher redemption fails: check that the router is online and the RADIUS secret matches between HDM and the router.',
      'M-Pesa transaction shows "pending": wait up to 5 minutes. If still pending, contact support with the receipt number.',
      'Cannot log in: check that your email is verified and your account has been approved by an admin.',
    ],
  },
];

export default function Help() {
  const { siteSettings } = useSite();

  const supportEmail = siteSettings?.['support.email'] || 'support@hdm.co.ke';
  const supportPhone = siteSettings?.['support.phone'] || '254768784909';
  const supportWebsite = siteSettings?.['support.website'] || 'https://hdm.co.ke';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <PageHeader
        title="Help & guides"
        description="Setup walkthroughs and troubleshooting for common issues."
      />

      <Card padding="md" className="mb-8">
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-slate-900 dark:text-slate-100">
              Can't find your answer?
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Our support team can help with router setup, M-Pesa issues, and account questions.
            </p>
            <div className="mt-3 grid gap-1.5 text-sm">
              <a
                href={`mailto:${supportEmail}`}
                className="text-brand-600 dark:text-brand-400 hover:underline break-all"
              >
                {supportEmail}
              </a>
              <a
                href={`tel:+${supportPhone.replace(/\D/g, '')}`}
                className="text-brand-600 dark:text-brand-400 hover:underline"
              >
                {formatPhone(supportPhone)}
              </a>
              <a
                href={supportWebsite}
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 dark:text-brand-400 hover:underline break-all"
              >
                {supportWebsite.replace(/^https?:\/\//, '')}
              </a>
            </div>
            <Link to="/contact" className="inline-block mt-3">
              <Button size="sm" variant="secondary">Contact support</Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-20">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 grid place-items-center">
                <s.icon className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {s.title}
              </h2>
            </div>
            <Card padding="md">
              <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {s.body.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}