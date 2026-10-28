import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Select from '../../components/ui/Select';
import Tabs from '../../components/ui/Tabs';
import Table from '../../components/ui/Table';
import StatusBadge from '../../components/ui/StatusBadge';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import {
  getCustomer,
  suspendCustomer,
  activateCustomer,
  deleteCustomer,
} from '../../api/customers';
import { renewCustomer } from '../../api/renewals';
import { listPlans } from '../../api/plans';
import { listTransactions } from '../../api/transactions';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import {
  formatMoney,
  formatDate,
  formatRelative,
  formatPhone,
  formatDataCap,
  formatDateTime,
} from '../../utils/format';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [txs, setTxs] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [plans, setPlans] = useState([]);

  const [renewOpen, setRenewOpen] = useState(false);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewing, setRenewing] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await getCustomer(id);
      setCustomer(data.data);
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions() {
    if (!customer?.phone) {
      setTxs([]);
      return;
    }
    setTxLoading(true);
    try {
      const { data } = await listTransactions({ phone: customer.phone, limit: 20 });
      setTxs(data.data || []);
    } catch {
      setTxs([]);
    } finally {
      setTxLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (customer && tab === 'transactions') loadTransactions();
  }, [customer, tab]);

  useEffect(() => {
    listPlans({ limit: 100, status: 'active' })
      .then(({ data }) => setPlans(data.data || []))
      .catch(() => {});
  }, []);

  async function doSuspend() {
    try {
      await suspendCustomer(id);
      toast.success('Customer suspended');
      setConfirmSuspend(false);
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    }
  }

  async function doActivate() {
    try {
      await activateCustomer(id);
      toast.success('Customer activated');
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    }
  }

  async function doDelete() {
    try {
      await deleteCustomer(id);
      toast.success('Customer deleted');
      navigate('/customers');
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    }
  }

  async function doRenew() {
    setRenewing(true);
    try {
      const payload = { customerId: id };
      if (renewPlanId) payload.planId = renewPlanId;
      await renewCustomer(payload);
      toast.success('Customer renewed');
      setRenewOpen(false);
      setRenewPlanId('');
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setRenewing(false);
    }
  }

  const txColumns = [
    { key: 'createdAt', header: 'Date', render: (t) => formatDateTime(t.createdAt) },
    { key: 'amount', header: 'Amount', render: (t) => formatMoney(t.amount, t.currency) },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'receipt', header: 'Receipt', render: (t) => t.mpesaReceiptNumber || '—' },
  ];

  if (loading && !customer) {
    return <div className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading…</div>;
  }
  if (!customer) {
    return (
      <EmptyState
        title="Customer not found"
        action={<Button onClick={() => navigate('/customers')}>Back to customers</Button>}
      />
    );
  }

  return (
    <div>
      <div className="mb-3">
        <button
          onClick={() => navigate('/customers')}
          className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Back to customers
        </button>
      </div>

      <PageHeader
        title={customer.username}
        description={customer.planId?.name ? `Plan: ${customer.planId.name}` : undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={load}
            >
              Refresh
            </Button>
            <Button size="sm" onClick={() => setRenewOpen(true)}>
              Renew
            </Button>
            {customer.status === 'suspended' ? (
              <Button size="sm" variant="secondary" onClick={doActivate}>
                Activate
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setConfirmSuspend(true)}>
                Suspend
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </div>
        }
      />

      <Card padding="md" className="mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={customer.username} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {customer.username}
              </span>
              <StatusBadge status={customer.status} />
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap gap-x-3">
              {customer.phone && <span>{formatPhone(customer.phone)}</span>}
              {customer.email && <span>{customer.email}</span>}
              {customer.expiresAt && <span>Expires {formatRelative(customer.expiresAt)}</span>}
            </div>
          </div>
        </div>
      </Card>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'transactions', label: 'Transactions' },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-4"
      />

      {tab === 'overview' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card padding="md">
            <div className="text-xs text-slate-500 dark:text-slate-400">Plan</div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
              {customer.planId?.name || '—'}
            </div>
            {customer.planId && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {formatMoney(customer.planId.price, customer.planId.currency)}
              </div>
            )}
          </Card>
          <Card padding="md">
            <div className="text-xs text-slate-500 dark:text-slate-400">Data used</div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
              {formatDataCap(customer.dataUsedMb)}
            </div>
          </Card>
          <Card padding="md">
            <div className="text-xs text-slate-500 dark:text-slate-400">Expires</div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
              {customer.expiresAt ? formatDate(customer.expiresAt) : '—'}
            </div>
          </Card>
          <Card padding="md">
            <div className="text-xs text-slate-500 dark:text-slate-400">MAC address</div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1 font-mono">
              {customer.macAddress || '—'}
            </div>
          </Card>
        </div>
      )}

      {tab === 'transactions' && (
        <Table
          columns={txColumns}
          rows={txs}
          getRowId={(t) => t._id}
          loading={txLoading}
          empty={<EmptyState title="No transactions" description="No M-Pesa payments recorded for this customer yet." />}
        />
      )}

      <Modal
        open={renewOpen}
        onClose={() => !renewing && setRenewOpen(false)}
        title="Renew customer"
        size="sm"
        dismissible={!renewing}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenewOpen(false)} disabled={renewing}>
              Cancel
            </Button>
            <Button loading={renewing} onClick={doRenew}>
              Renew
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          The new expiry stacks on top of the current expiry — no unused time is lost.
        </p>
        <Select
          label="Plan"
          value={renewPlanId}
          onChange={(e) => setRenewPlanId(e.target.value)}
        >
          <option value="">Use current plan</option>
          {plans.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Modal>

      <ConfirmDialog
        open={confirmSuspend}
        onClose={() => setConfirmSuspend(false)}
        onConfirm={doSuspend}
        title="Suspend customer?"
        description={`"${customer.username}" will be disconnected and cannot log in until activated.`}
        confirmLabel="Suspend"
        danger
      />

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={doDelete}
        title="Delete customer?"
        description={`"${customer.username}" will be permanently removed.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}