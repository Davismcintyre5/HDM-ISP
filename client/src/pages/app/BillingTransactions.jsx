import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { listBillingTransactions } from '../../api/billing';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { formatMoney, formatDateTime, formatPhone } from '../../utils/format';

export default function BillingTransactions() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);

  async function load(page = meta.page, limit = meta.limit) {
    setLoading(true);
    try {
      const { data } = await listBillingTransactions({ page, limit });
      setRows(data.data || []);
      setMeta(data.meta || { page, limit, total: data.data?.length || 0 });
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const columns = useMemo(
    () => [
      {
        key: 'createdAt',
        header: 'Date',
        render: (t) => formatDateTime(t.createdAt),
      },
      { key: 'phone', header: 'Phone', render: (t) => formatPhone(t.phone) },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        render: (t) => formatMoney(t.amount, t.currency),
      },
      { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
      {
        key: 'receipt',
        header: 'Receipt',
        render: (t) => t.mpesaReceiptNumber || '—',
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Billing transactions"
        description="Your subscription payments through M-Pesa."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/billing')}>
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

      <Table
        columns={columns}
        rows={rows}
        getRowId={(t) => t._id}
        loading={loading}
        empty={
          <EmptyState
            icon={<Receipt className="h-8 w-8" />}
            title="No billing transactions"
            description="Payments made toward your subscription will show up here."
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