import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import { cn } from '../../utils/cn';

const FAQS = [
  {
    category: 'Getting started',
    items: [
      {
        q: 'How long is the free trial?',
        a: '14 days from the day you verify your email. All features are unlocked during the trial.',
      },
      {
        q: 'Do I need approval to start?',
        a: 'Yes. After registering and verifying your email, an admin reviews your account. Once approved, you land in the dashboard on the Free Trial plan.',
      },
      {
        q: 'Can I invite staff to my account?',
        a: 'Currently each account has a single owner. Multi-user support is on the roadmap.',
      },
    ],
  },
  {
    category: 'Routers',
    items: [
      {
        q: 'Which MikroTik versions are supported?',
        a: 'RouterOS 6.47+ and RouterOS 7. Older versions may work but are not tested.',
      },
      {
        q: 'Why does my router show as offline?',
        a: 'Most often the API service is disabled on the router, or the credentials saved in HDM do not match. Use the "Test connection" action on the Routers page to see the exact error.',
      },
      {
        q: 'What port does HDM use to talk to my router?',
        a: 'RouterOS API on TCP 8728 by default. If you configured a custom port on the router, enter that same port in HDM.',
      },
      {
        q: 'Is the router password stored securely?',
        a: 'Yes. Router passwords and RADIUS secrets are encrypted at rest with AES-256-GCM and are never returned by the API.',
      },
    ],
  },
  {
    category: 'Vouchers',
    items: [
      {
        q: 'How many vouchers can I generate at once?',
        a: 'Up to 1,000 per batch. Each batch has its own ID for easier tracking.',
      },
      {
        q: 'Can I see the codes again after generating?',
        a: 'No. The full list is only shown once, right after generation. Download the CSV or print immediately — after that, individual codes are visible only in the vouchers list.',
      },
      {
        q: 'How long are vouchers valid?',
        a: '30 days by default from the generation date. You can set a custom expiry when generating.',
      },
      {
        q: 'Can I revoke a voucher?',
        a: 'Only unused vouchers can be revoked. Once redeemed, a voucher cannot be revoked through the dashboard.',
      },
    ],
  },
  {
    category: 'Customers',
    items: [
      {
        q: 'What happens when I suspend a customer?',
        a: 'Their status is set to suspended and they are disconnected from the router immediately. They cannot log back in until reactivated.',
      },
      {
        q: 'Does renewing early waste their remaining time?',
        a: 'No. The new expiry starts from the later of now or their current expiry. If they have 3 days left and you renew for 7 more, they get 10 days total.',
      },
    ],
  },
  {
    category: 'Billing & payments',
    items: [
      {
        q: 'How do customers pay?',
        a: 'Through M-Pesa on the customer-facing portal. You configure your paybill details in Settings.',
      },
      {
        q: 'Where do I see transaction history?',
        a: 'The Transactions page shows every M-Pesa transaction for your provider, filterable by date, phone, and status.',
      },
      {
        q: 'Do I get invoices for my own subscription?',
        a: 'Provider subscription billing is separate. Contact support for invoices or billing changes.',
      },
    ],
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{q}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-slate-400 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

export default function Faqs() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return FAQS;
    const q = query.toLowerCase();
    return FAQS.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <PageHeader
        title="Frequently asked questions"
        description="Answers to the most common questions about the HDM Provider Console."
      />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search FAQs…"
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {filtered.length === 0 ? (
        <Card padding="lg">
          <div className="text-center text-sm text-slate-600 dark:text-slate-300">
            No results for "{query}". Try a different search.
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {filtered.map((cat) => (
            <section key={cat.category}>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                {cat.category}
              </h2>
              <div className="space-y-2">
                {cat.items.map((it) => (
                  <FaqItem key={it.q} q={it.q} a={it.a} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}