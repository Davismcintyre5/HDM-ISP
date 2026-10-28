import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { getTransaction } from '../../api/transactions';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { formatMoney, formatDateTime, formatPhone } from '../../utils/format';

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getTransaction(id)
      .then((r) => {
        if (!cancelled) setTx(r.data.data);
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
  }, [id]);

  if (loading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>;
  }
  if (!tx) {
    return (
      <EmptyState
        title="Transaction not found"
        action={<Button onClick={() => navigate('/transactions')}>Back to transactions</Button>}
      />
    );
  }

  return (
    <div>
      <div className="mb-3">
        <button
          onClick={() => navigate('/transactions')}
          className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Back to transactions
        </button>
      </div>

      <PageHeader
        title={formatMoney(tx.amount, tx.currency)}
        description={tx.mpesaReceiptNumber ? `Receipt ${tx.mpesaReceiptNumber}` : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <Card padding="md">
          <div className="text-xs text-slate-500 dark:text-slate-400">Status</div>
          <div className="mt-1"><StatusBadge status={tx.status} /></div>
        </Card>
        <Card padding="md">
          <div className="text-xs text-slate-500 dark:text-slate-400">Kind</div>
          <div className="mt-1"><StatusBadge status={tx.kind} /></div>
        </Card>
        <Card padding="md">
          <div className="text-xs text-slate-500 dark:text-slate-400">Phone</div>
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
            {formatPhone(tx.phone)}
          </div>
        </Card>
        <Card padding="md">
          <div className="text-xs text-slate-500 dark:text-slate-400">Date</div>
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
            {formatDateTime(tx.createdAt)}
          </div>
        </Card>
      </div>

      {tx.rawCallback && (
        <Card padding="md">
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-slate-900 dark:text-slate-100">
              Raw Safaricom callback
            </summary>
            <pre className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300 overflow-x-auto">
              {JSON.stringify(tx.rawCallback, null, 2)}
            </pre>
          </details>
        </Card>
      )}
    </div>
  );
}