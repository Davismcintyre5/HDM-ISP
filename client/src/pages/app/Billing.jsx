import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  CheckCircle2,
  RefreshCw,
  ArrowUpCircle,
  Receipt,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import {
  getCurrentSubscription,
  getAvailablePlans,
  initiateUpgrade,
  initiateRenewal,
  listInvoices,
} from '../../api/billing';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { formatMoney, formatDate } from '../../utils/format';

export default function Billing() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [current, setCurrent] = useState(null);
  const [plans, setPlans] = useState([]);
  const [pendingInvoice, setPendingInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [invoiceResult, setInvoiceResult] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [cur, avail, inv] = await Promise.all([
        getCurrentSubscription(),
        getAvailablePlans(),
        listInvoices({ limit: 1, status: 'sent' }).catch(() => ({ data: { data: [] } })),
      ]);

      setCurrent(cur.data.data);
      setPlans(avail.data.data || []);

      const sentInvoices = inv.data.data || [];
      const pending =
        sentInvoices.find((i) => ['sent', 'overdue', 'draft'].includes(i.status)) || null;
      setPendingInvoice(pending);
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const hasPending = !!pendingInvoice;
  const actionsBlocked = hasPending;

  async function handleRenew() {
    if (actionsBlocked) return;
    setActing('renew');
    try {
      const { data } = await initiateRenewal();
      setInvoiceResult(data.data);
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setActing(null);
    }
  }

  async function handleUpgrade(planId) {
    if (actionsBlocked) return;
    setActing(planId);
    try {
      const { data } = await initiateUpgrade(planId);
      setInvoiceResult(data.data);
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Your subscription plan, invoices, and payment history."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Receipt className="h-4 w-4" />}
              onClick={() => navigate('/billing/invoices')}
            >
              Invoices
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={load}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="py-16 grid place-items-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          {hasPending && (
            <Card
              padding="md"
              className="border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 grid place-items-center shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-amber-900 dark:text-amber-200">
                      Pending invoice
                    </span>
                    <StatusBadge status={pendingInvoice.status} />
                  </div>
                  <div className="text-sm text-amber-800 dark:text-amber-300 mt-1 space-y-0.5">
                    <div>
                      <span className="font-mono text-xs">
                        {pendingInvoice.invoiceNumber || pendingInvoice.number || '—'}
                      </span>
                      {' · '}
                      {formatMoney(
                        pendingInvoice.amountDue ?? pendingInvoice.total ?? 0,
                        pendingInvoice.currency
                      )}
                      {pendingInvoice.dueDate && (
                        <> · Due {formatDate(pendingInvoice.dueDate)}</>
                      )}
                    </div>
                    <div className="text-xs">
                      Complete payment on this invoice before renewing or changing plans.
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      leftIcon={<FileText className="h-3.5 w-3.5" />}
                      onClick={() => navigate(`/billing/invoices/${pendingInvoice._id}`)}
                    >
                      View invoice
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card padding="md">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 grid place-items-center">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Current plan
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {current?.plan?.name || '—'}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-slate-500 dark:text-slate-400">
                  <StatusBadge status={current?.billingStatus || 'inactive'} />
                  {current?.isTrial && <Badge tone="info">Trial</Badge>}
                  {current?.isExpired && <Badge tone="danger">Expired</Badge>}
                  {current?.plan && (
                    <span>
                      · {formatMoney(current.plan.price, current.plan.currency)} /{' '}
                      {current.plan.billingCycle}
                    </span>
                  )}
                  {current?.subscriptionEndsAt && (
                    <span>
                      · {current.isExpired ? 'Expired' : 'Renews'}{' '}
                      {formatDate(current.subscriptionEndsAt)}
                    </span>
                  )}
                  {typeof current?.daysLeft === 'number' && (
                    <span>
                      · {current.daysLeft} day{current.daysLeft === 1 ? '' : 's'} left
                    </span>
                  )}
                </div>
                {current?.plan?.description && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {current.plan.description}
                  </p>
                )}
                {current?.canRenew && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                      onClick={handleRenew}
                      loading={acting === 'renew'}
                      disabled={actionsBlocked}
                      title={
                        actionsBlocked
                          ? 'Pay the pending invoice first'
                          : undefined
                      }
                    >
                      Renew now
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Available plans
            </h2>
            {plans.length === 0 ? (
              <Card padding="md">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  No plans available right now.
                </div>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((p) => (
                  <Card key={p._id} padding="md">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {p.name}
                      </div>
                      {p.isCurrent && <Badge tone="success">Current</Badge>}
                      {p.isUpgrade && <Badge tone="info">Upgrade</Badge>}
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                      {formatMoney(p.price, p.currency)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      per {p.billingCycle}
                    </div>
                    {p.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                        {p.description}
                      </p>
                    )}
                    {Array.isArray(p.features) && p.features.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                        {p.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {p.canSelect && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          leftIcon={<ArrowUpCircle className="h-3.5 w-3.5" />}
                          onClick={() => handleUpgrade(p._id)}
                          loading={acting === p._id}
                          disabled={actionsBlocked}
                          title={
                            actionsBlocked
                              ? 'Pay the pending invoice first'
                              : undefined
                          }
                        >
                          Choose plan
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={!!invoiceResult}
        onClose={() => setInvoiceResult(null)}
        title="Invoice created"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInvoiceResult(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                const id = invoiceResult?.invoice?.id;
                setInvoiceResult(null);
                if (id) navigate(`/billing/invoices/${id}`);
              }}
            >
              View invoice
            </Button>
          </>
        }
      >
        {invoiceResult?.invoice && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Your invoice has been created and emailed to you. Complete payment to activate
              your plan.
            </p>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Invoice</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {invoiceResult.invoice.invoiceNumber}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-slate-500 dark:text-slate-400">Plan</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {invoiceResult.invoice.planName}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-slate-500 dark:text-slate-400">Amount</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatMoney(invoiceResult.invoice.amount, invoiceResult.invoice.currency)}
                </span>
              </div>
              {invoiceResult.invoice.dueDate && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-slate-500 dark:text-slate-400">Due</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(invoiceResult.invoice.dueDate)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}