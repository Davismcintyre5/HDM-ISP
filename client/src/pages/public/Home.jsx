import { Link } from 'react-router-dom';
import {
  Wifi,
  Ticket,
  Router as RouterIcon,
  BarChart3,
  Shield,
  Smartphone,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const FEATURES = [
  {
    icon: Ticket,
    title: 'Voucher management',
    body: 'Generate, print, and revoke hotspot vouchers in batches of up to 1,000. Codes are one-shot and secure.',
  },
  {
    icon: RouterIcon,
    title: 'MikroTik integration',
    body: 'Connect RouterOS devices directly. Apply rate limits, kick suspended users, and view live sessions.',
  },
  {
    icon: Smartphone,
    title: 'M-Pesa payments',
    body: 'Sell plans through M-Pesa. Transactions and receipts reconcile automatically in your dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Reports that matter',
    body: 'Daily revenue, session usage, and customer counts — filterable by date range.',
  },
  {
    icon: Shield,
    title: 'Tenant isolation',
    body: 'Every query is scoped to your provider account. Your data is not visible to any other tenant.',
  },
  {
    icon: Wifi,
    title: 'Hotspot-first',
    body: 'Designed for Kenyan WISPs and cyber cafés. Bring your routers, sell access, get paid.',
  },
];

const FAQ_TEASER = [
  {
    q: 'How long is the free trial?',
    a: '14 days, no card required. Full feature access for the trial period.',
  },
  {
    q: 'Do I need my own MikroTik router?',
    a: 'Yes — the dashboard manages routers you already own. No hardware is sold by HDM.',
  },
  {
    q: 'How do customers pay?',
    a: 'Through M-Pesa STK push on the customer-facing portal. Funds settle to your paybill.',
  },
];

export default function Home() {
  return (
    <div>
      <section className="border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-brand-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <Badge tone="info" className="mb-4">
            Now with MikroTik RouterOS 7 support
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Run your hotspot business from one dashboard
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-base md:text-lg text-slate-600 dark:text-slate-300">
            Plans, vouchers, routers, customers, and M-Pesa payments — built for Kenyan ISPs.
            Start free for 14 days.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register">
              <Button size="lg">Start free trial</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Everything you need
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            One dashboard for the whole operation.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} padding="lg">
              <div className="h-10 w-10 rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 grid place-items-center mb-3">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{f.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {f.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40">
        <div className="max-w-4xl mx-auto px-4 py-14 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Simple, transparent pricing
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            Start on our 14-day free trial. No credit card required.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto">
            <Card padding="lg" className="text-left">
              <div className="text-sm font-medium text-brand-700 dark:text-brand-300">Free Trial</div>
              <div className="text-3xl font-bold mt-1 text-slate-900 dark:text-slate-100">14 days</div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                Full dashboard access. Set up routers, sell vouchers, take M-Pesa payments.
              </p>
            </Card>
            <Card padding="lg" className="text-left">
              <div className="text-sm font-medium text-brand-700 dark:text-brand-300">After trial</div>
              <div className="text-3xl font-bold mt-1 text-slate-900 dark:text-slate-100">Contact us</div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                Billed monthly. Volume discounts for larger ISPs. Get in touch for a quote.
              </p>
              <Link to="/contact" className="inline-block mt-3">
                <Button size="sm" variant="secondary">Talk to sales</Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
            Common questions
          </h2>
        </div>
        <div className="space-y-3">
          {FAQ_TEASER.map((f) => (
            <Card key={f.q} padding="md">
              <div className="font-medium text-slate-900 dark:text-slate-100">{f.q}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">{f.a}</div>
            </Card>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link to="/faqs" className="text-sm text-brand-600 dark:text-brand-400 hover:underline">
            View all FAQs →
          </Link>
        </div>
      </section>

      <section className="border-t border-slate-200 dark:border-slate-800 bg-brand-600 dark:bg-brand-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-14 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to start selling?</h2>
          <p className="mt-2 text-white/90">
            Set up your first router and generate your first voucher in under 10 minutes.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register">
              <Button size="lg" variant="secondary" className="bg-white text-brand-700 hover:bg-slate-100">
                Create free account
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10">
                Book a demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}