import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Router as RouterIcon,
  Ticket,
  Activity,
  Coins,
  Plus,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import Skeleton from '../../components/ui/Skeleton';
import { getDashboardSummary } from '../../api/dashboard';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { formatMoney, formatNumber, formatDate } from '../../utils/format';

function StatCard({ icon: Icon, label, value, sub, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300',
    green: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  };
  return (
    <Card padding="md">
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg grid place-items-center ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
            {value}
          </div>
          {sub && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDashboardSummary()
      .then((r) => {
        if (!cancelled) setData(r.data.data);
      })
      .catch((err) => {
        if (!cancelled) toast.error(errors.fromAxios(err).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const provider = data?.provider;
  const customers = data?.customers;
  const routers = data?.routers;
  const vouchers = data?.vouchers;
  const today = data?.today;
  const sessions = data?.sessions;

  return (
    <div>
      <PageHeader
        title={provider?.name ? `Welcome back` : 'Dashboard'}
        description={
          provider?.name
            ? `${provider.name} · ${provider.billingStatus === 'active' ? 'Active' : 'Inactive'} plan`
            : undefined
        }
        actions={
          <div className="flex gap-2">
            <Link to="/vouchers">
              <Button variant="secondary" size="sm" leftIcon={<Ticket className="h-4 w-4" />}>
                Vouchers
              </Button>
            </Link>
            <Link to="/customers">
              <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                New customer
              </Button>
            </Link>
          </div>
        }
      />

      {provider && (
        <Card padding="md" className="mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={provider.status} />
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Plan: <span className="font-medium">{provider.billingPlan?.name || '—'}</span>
              {provider.subscriptionEndsAt && (
                <>
                  {' · '}
                  Ends {formatDate(provider.subscriptionEndsAt)}
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <Card key={i} padding="md">
              <Skeleton variant="rect" height={72} />
            </Card>
          ))
        ) : (
          <>
            <StatCard
              icon={Users}
              label="Customers"
              value={customers ? formatNumber(customers.total) : '—'}
              sub={customers ? `${formatNumber(customers.active)} active` : undefined}
              tone="brand"
            />
            <StatCard
              icon={RouterIcon}
              label="Routers"
              value={routers ? formatNumber(routers.total) : '—'}
              sub={routers ? `${formatNumber(routers.online)} online` : undefined}
              tone="blue"
            />
            <StatCard
              icon={Ticket}
              label="Vouchers unused"
              value={vouchers ? formatNumber(vouchers.unused) : '—'}
              tone="amber"
            />
            <StatCard
              icon={Activity}
              label="Active sessions"
              value={sessions ? formatNumber(sessions.active) : '—'}
              tone="green"
            />
          </>
        )}
      </div>

      <div className="grid gap-3 mt-3 lg:grid-cols-2">
        <Card padding="md">
          <div className="text-sm text-slate-500 dark:text-slate-400">Today</div>
          {loading ? (
            <Skeleton variant="text" width={120} height={28} className="mt-2" />
          ) : (
            <div className="mt-1 flex items-baseline gap-2">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatMoney(today?.revenue || 0)}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                from {formatNumber(today?.completedTransactions || 0)} transactions
              </div>
            </div>
          )}
        </Card>
        <Card padding="md">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 grid place-items-center">
              <Coins className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-slate-500 dark:text-slate-400">Quick actions</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link to="/plans">
                  <Button size="sm" variant="secondary">New plan</Button>
                </Link>
                <Link to="/routers">
                  <Button size="sm" variant="secondary">Add router</Button>
                </Link>
                <Link to="/vouchers">
                  <Button size="sm" variant="secondary">Generate vouchers</Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}