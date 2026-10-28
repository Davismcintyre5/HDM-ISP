import { useEffect, useMemo, useState } from 'react';
import { BarChart3, RefreshCw, Coins, Activity, Users } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Tabs from '../../components/ui/Tabs';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import DateRangeInput from '../../components/ui/DateRangeInput';
import { getRevenueReport, getSessionsReport, getCustomerCounts } from '../../api/reports';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { formatMoney, formatDate, formatNumber, formatDataCap } from '../../utils/format';

function defaultRange() {
  const to = new Date();
  const from = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

export default function Reports() {
  const { toast } = useToast();
  const [active, setActive] = useState('revenue');
  const [range, setRange] = useState(defaultRange);

  const [revenue, setRevenue] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const params = { from: range.from, to: range.to };
      const [revRes, sesRes, cntRes] = await Promise.all([
        getRevenueReport(params).catch((e) => ({ error: e })),
        getSessionsReport(params).catch((e) => ({ error: e })),
        getCustomerCounts().catch((e) => ({ error: e })),
      ]);
      if (!revRes.error) setRevenue(revRes.data.data || []);
      else toast.error(errors.fromAxios(revRes.error).message);

      if (!sesRes.error) setSessions(sesRes.data.data || []);
      else toast.error(errors.fromAxios(sesRes.error).message);

      if (!cntRes.error) setCounts(cntRes.data.data || null);
      else toast.error(errors.fromAxios(cntRes.error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [range.from, range.to]);

  const revenueTotals = useMemo(() => {
    if (!revenue) return null;
    return revenue.reduce(
      (acc, r) => ({ total: acc.total + (r.total || 0), count: acc.count + (r.count || 0) }),
      { total: 0, count: 0 }
    );
  }, [revenue]);

  const sessionTotals = useMemo(() => {
    if (!sessions) return null;
    return sessions.reduce(
      (acc, r) => ({
        sessions: acc.sessions + (r.sessions || 0),
        mbIn: acc.mbIn + (r.mbIn || 0),
        mbOut: acc.mbOut + (r.mbOut || 0),
      }),
      { sessions: 0, mbIn: 0, mbOut: 0 }
    );
  }, [sessions]);

  const revenueColumns = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'count', header: 'Transactions', align: 'right', render: (r) => formatNumber(r.count) },
    { key: 'total', header: 'Revenue', align: 'right', render: (r) => formatMoney(r.total) },
  ];

  const sessionColumns = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'sessions', header: 'Sessions', align: 'right', render: (r) => formatNumber(r.sessions) },
    { key: 'mbIn', header: 'In', align: 'right', render: (r) => formatDataCap(r.mbIn) },
    { key: 'mbOut', header: 'Out', align: 'right', render: (r) => formatDataCap(r.mbOut) },
  ];

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Revenue, session usage, and customer counts over time."
        actions={
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={loadAll}
            disabled={loading}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        }
      />

      <Card padding="md" className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-300">Date range</span>
          <DateRangeInput from={range.from} to={range.to} onChange={setRange} />
        </div>
      </Card>

      <Tabs
        tabs={[
          { id: 'revenue', label: 'Revenue' },
          { id: 'sessions', label: 'Sessions' },
          { id: 'customers', label: 'Customers' },
        ]}
        active={active}
        onChange={setActive}
        className="mb-4"
      />

      {active === 'revenue' && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card padding="md">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 grid place-items-center">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Total revenue</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {revenueTotals ? formatMoney(revenueTotals.total) : '—'}
                  </div>
                </div>
              </div>
            </Card>
            <Card padding="md">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 grid place-items-center">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Transactions</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {revenueTotals ? formatNumber(revenueTotals.count) : '—'}
                  </div>
                </div>
              </div>
            </Card>
          </div>
          <Table
            columns={revenueColumns}
            rows={revenue || []}
            loading={loading && !revenue}
            getRowId={(r) => r.date}
            empty={
              <EmptyState
                icon={<BarChart3 className="h-8 w-8" />}
                title="No revenue in this range"
                description="Try a wider date range."
              />
            }
          />
        </div>
      )}

      {active === 'sessions' && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card padding="md">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 grid place-items-center">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Sessions</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {sessionTotals ? formatNumber(sessionTotals.sessions) : '—'}
                  </div>
                </div>
              </div>
            </Card>
            <Card padding="md">
              <div className="text-sm text-slate-500 dark:text-slate-400">Data in</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {sessionTotals ? formatDataCap(sessionTotals.mbIn) : '—'}
              </div>
            </Card>
            <Card padding="md">
              <div className="text-sm text-slate-500 dark:text-slate-400">Data out</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {sessionTotals ? formatDataCap(sessionTotals.mbOut) : '—'}
              </div>
            </Card>
          </div>
          <Table
            columns={sessionColumns}
            rows={sessions || []}
            loading={loading && !sessions}
            getRowId={(r) => r.date}
            empty={
              <EmptyState
                icon={<Activity className="h-8 w-8" />}
                title="No sessions in this range"
                description="Try a wider date range."
              />
            }
          />
        </div>
      )}

      {active === 'customers' && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card padding="md">
            <div className="text-sm text-slate-500 dark:text-slate-400">Total</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {counts ? formatNumber(counts.total) : '—'}
            </div>
          </Card>
          <Card padding="md">
            <div className="text-sm text-slate-500 dark:text-slate-400">Active</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {counts ? formatNumber(counts.active) : '—'}
            </div>
          </Card>
          <Card padding="md">
            <div className="text-sm text-slate-500 dark:text-slate-400">Expired</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {counts ? formatNumber(counts.expired) : '—'}
            </div>
          </Card>
          <Card padding="md">
            <div className="text-sm text-slate-500 dark:text-slate-400">Suspended</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {counts ? formatNumber(counts.suspended) : '—'}
            </div>
          </Card>
          {counts && (
            <Card padding="md" className="sm:col-span-2 lg:col-span-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 grid place-items-center">
                  <Users className="h-5 w-5" />
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  Counts are current — they do not depend on the date range above.
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}