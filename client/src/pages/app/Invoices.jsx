import { useEffect, useMemo, useState } from 'react';
import { Receipt, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { listInvoices } from '../../api/billing';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { formatMoney, formatDate } from '../../utils/format';

export default function Invoices() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [purposeFilter, setPurposeFilter] = useState('all');

  async function load(page = meta.page, limit = meta.limit) {
    setLoading(true);
    try {
      const { data } = await listInvoices({
        page,
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
        purpose: purposeFilter === 'all' ? undefined : purposeFilter,
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
  }, [statusFilter, purposeFilter]);

  const columns = useMemo(
    () => [
      { key: 'invoiceNumber', header: 'Invoice', render: (i) => i.invoiceNumber },
      {
        key: 'purpose',
        header: 'Purpose',
        render: (i) => <StatusBadge status={i.purpose} />,
      },
      {
        key: 'total',
        header: 'Amount',
        align: 'right',
        render: (i) => formatMoney(i.total, i.currency),
      },
      { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
      {
        key: 'issuedAt',
        header: 'Issued',
        render: (i) => formatDate(i.issuedAt),
      },
      {
        key: 'dueDate',
        header: 'Due',
        render: (i) => formatDate(i.dueDate),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (i) => (
          <button
            onClick={() => navigate(`/billing/invoices/${i._id}`)}
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
        title="Invoices"
        description="Subscription invoices for your account."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/billing')}
            >
              Back to billing
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => load()}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <Card padding="md" className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={purposeFilter}
            onChange={(e) => setPurposeFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100"
          >
            <option value="all">All purposes</option>
            <option value="subscription">Subscription</option>
            <option value="upgrade">Upgrade</option>
            <option value="renewal">Renewal</option>
          </select>
        </div>
      </Card>

      <Table
        columns={columns}
        rows={rows}
        getRowId={(i) => i._id}
        loading={loading}
        empty={
          <EmptyState
            icon={<Receipt className="h-8 w-8" />}
            title="No invoices"
            description="Invoices for plan renewals and upgrades will appear here."
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