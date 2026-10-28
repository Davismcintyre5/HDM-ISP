import { useEffect, useMemo, useState } from 'react';
import { Receipt, RefreshCw, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import DateRangeInput from '../../components/ui/DateRangeInput';
import { listTransactions, getTransactionSummary } from '../../api/transactions';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { formatMoney, formatDateTime, formatPhone, formatNumber } from '../../utils/format';

export default function Transactions() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [phone, setPhone] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [summary, setSummary] = useState(null);

  async function load(page = meta.page, limit = meta.limit) {
    setLoading(true);
    try {
      const { data } = await listTransactions({
        page,
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
        kind: kindFilter === 'all' ? undefined : kindFilter,
        phone: phone || undefined,
        from: range.from || undefined,
        to: range.to || undefined,
      });
      setRows(data.data || []);
      setMeta(data.meta || { page, limit, total: data.data?.length || 0 });
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, meta.limit);
  }, [statusFilter, kindFilter, phone, range.from, range.to]);

  useEffect(() => {
    getTransactionSummary()
      .then(({ data }) => setSummary(data.data?.last30Days || null))
      .catch(() => {});
  }, []);

  const columns = useMemo(
    () => [
      {
        key: 'createdAt',
        header: 'Date',
        render: (t) => formatDateTime(t.createdAt),
      },
      {
        key: 'phone',
        header: 'Phone',
        render: (t) => formatPhone(t.phone),
      },
      {
        key: 'amount',
        header: 'Amount',
        render: (t) => formatMoney(t.amount, t.currency),
      },
      { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
      { key: 'kind', header: 'Kind', render: (t) => <StatusBadge status={t.kind} /> },
      {
        key: 'receipt',
        header: 'Receipt',
        render: (t) => t.mpesaReceiptNumber || '—',
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (t) => (
          <button
            onClick={() => navigate(`/transactions/${t._id}`)}
            className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
          >
            View
          </button>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Every M-Pesa payment recorded for your provider."
      />

      <Card padding="md" className="mb-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 grid place-items-center">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Last 30 days</div>
            {summary ? (
              <div className="mt-0.5">
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {formatMoney(summary.revenue)}
                </span>
                <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                  from {formatNumber(summary.completed)} completed transactions
                </span>
              </div>
            ) : (
              <div className="mt-1 h-5 w-40 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
            )}
          </div>
        </div>
      </Card>

      <Card padding="md" className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={phone}
            onSearch={setPhone}
            placeholder="Filter by phone…"
            className="w-full sm:w-56"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100"
          >
            <option value="all">All kinds</option>
            <option value="customer_purchase">Customer purchase</option>
            <option value="provider_subscription">Provider subscription</option>
          </select>
          <DateRangeInput from={range.from} to={range.to} onChange={setRange} />
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => load()}
          >
            Refresh
          </Button>
        </div>
      </Card>

      <Table
        columns={columns}
        rows={rows}
        getRowId={(t) => t._id}
        loading={loading}
        empty={
          <EmptyState
            icon={<Receipt className="h-8 w-8" />}
            title="No transactions yet"
            description="M-Pesa payments will show up here as customers buy plans."
          />
        }
      />

      <Pagination
        page={meta.page}
        limit={meta.limit}
        total={meta.total}
        onPageChange={(p) => load(p, meta.limit)}
        onLimitChange={(l) => load(1, l)}
      />
    </div>
  );
}