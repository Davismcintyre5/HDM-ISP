import { useEffect, useMemo, useState } from 'react';
import { Users, Plus, RefreshCw, ArrowUpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatusBadge from '../../components/ui/StatusBadge';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import Checkbox from '../../components/ui/Checkbox';
import {
  listCustomers,
  createCustomer,
  suspendCustomer,
  activateCustomer,
  deleteCustomer,
} from '../../api/customers';
import { listPlans } from '../../api/plans';
import { bulkRenewCustomers } from '../../api/renewals';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { validateCustomer } from '../../utils/validators';
import { sanitizePhone, formatDate, formatRelative, formatDataCap, formatPhone } from '../../utils/format';

const EMPTY_FORM = {
  username: '',
  phone: '',
  email: '',
  macAddress: '',
  planId: '',
  expiresAt: '',
};

export default function Customers() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [plans, setPlans] = useState([]);

  const [selectedIds, setSelectedIds] = useState([]);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewing, setRenewing] = useState(false);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [deleting, setDeleting] = useState(null);
  const [suspending, setSuspending] = useState(null);

  async function load(page = meta.page, limit = meta.limit) {
    setLoading(true);
    try {
      const { data } = await listCustomers({
        page,
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
      });
      setRows(data.data || []);
      setMeta(data.meta || { page, limit, total: data.data?.length || 0 });
      setSelectedIds([]);
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, meta.limit);
  }, [statusFilter, search]);

  useEffect(() => {
    listPlans({ limit: 100, status: 'active' })
      .then(({ data }) => setPlans(data.data || []))
      .catch(() => {});
  }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setCreating(true);
  }

  function closeCreate() {
    if (submitting) return;
    setCreating(false);
  }

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function saveCreate(e) {
    e.preventDefault();
    const validation = validateCustomer(form);
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      return;
    }
    setSubmitting(true);
    try {
      await createCustomer({
        username: form.username.trim(),
        phone: form.phone ? sanitizePhone(form.phone) : undefined,
        email: form.email.trim() || undefined,
        macAddress: form.macAddress.trim() || undefined,
        planId: form.planId || undefined,
        expiresAt: form.expiresAt || undefined,
      });
      toast.success('Customer created');
      setCreating(false);
      load();
    } catch (err) {
      const e2 = errors.fromAxios(err);
      if (e2.status === 409) setFieldErrors({ username: e2.message });
      else toast.error(e2.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSuspend(customer) {
    setSuspending(customer);
  }

  async function confirmSuspend() {
    if (!suspending) return;
    try {
      await suspendCustomer(suspending._id);
      toast.success('Customer suspended');
      setSuspending(null);
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    }
  }

  async function handleActivate(customer) {
    try {
      await activateCustomer(customer._id);
      toast.success('Customer activated');
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteCustomer(deleting._id);
      toast.success('Customer deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    }
  }

  async function confirmBulkRenew() {
    if (!renewPlanId) {
      toast.error('Pick a plan to renew into');
      return;
    }
    setRenewing(true);
    try {
      const { data } = await bulkRenewCustomers({
        customerIds: selectedIds,
        planId: renewPlanId,
      });
      const renewed = data?.data?.renewed ?? selectedIds.length;
      toast.success(`Renewed ${renewed} customer(s)`);
      setRenewOpen(false);
      setRenewPlanId('');
      setSelectedIds([]);
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setRenewing(false);
    }
  }

  function toggleSelect(id) {
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const columns = useMemo(
    () => [
      {
        key: 'select',
        header: '',
        width: 40,
        render: (r) => (
          <Checkbox
            checked={selectedIds.includes(r._id)}
            onChange={() => toggleSelect(r._id)}
          />
        ),
      },
      { key: 'username', header: 'Username' },
      { key: 'phone', header: 'Phone', render: (r) => (r.phone ? formatPhone(r.phone) : '—') },
      {
        key: 'plan',
        header: 'Plan',
        render: (r) => r.planId?.name || '—',
      },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
      {
        key: 'expires',
        header: 'Expires',
        render: (r) => (r.expiresAt ? formatRelative(r.expiresAt) : '—'),
      },
      {
        key: 'data',
        header: 'Data used',
        render: (r) => formatDataCap(r.dataUsedMb),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (r) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => navigate(`/customers/${r._id}`)}
              className="text-sm text-slate-700 dark:text-slate-300 hover:underline"
            >
              View
            </button>
            {r.status === 'suspended' ? (
              <button
                onClick={() => handleActivate(r)}
                className="text-sm text-green-600 dark:text-green-400 hover:underline"
              >
                Activate
              </button>
            ) : (
              <button
                onClick={() => handleSuspend(r)}
                className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
              >
                Suspend
              </button>
            )}
            <button
              onClick={() => setDeleting(r)}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [selectedIds, suspending]
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Every hotspot user with an active plan, voucher, or manual account."
        actions={
          <div className="flex gap-2">
            {selectedIds.length > 0 && (
              <Button
                variant="secondary"
                leftIcon={<ArrowUpCircle className="h-4 w-4" />}
                onClick={() => setRenewOpen(true)}
              >
                Renew ({selectedIds.length})
              </Button>
            )}
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              New customer
            </Button>
          </div>
        }
      />

      <Card padding="md" className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onSearch={setSearch}
            placeholder="Search username, phone, MAC…"
            className="w-full sm:w-72"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
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
        getRowId={(r) => r._id}
        loading={loading}
        empty={
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No customers yet"
            description="Customers appear here when they redeem vouchers, or you can create one manually."
            action={<Button onClick={openCreate}>New customer</Button>}
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

      <Modal
        open={creating}
        onClose={closeCreate}
        title="New customer"
        size="md"
        dismissible={!submitting}
        footer={
          <>
            <Button variant="secondary" onClick={closeCreate} disabled={submitting}>
              Cancel
            </Button>
            <Button form="customer-form" type="submit" loading={submitting}>
              Create
            </Button>
          </>
        }
      >
        <form id="customer-form" onSubmit={saveCreate} className="space-y-4">
          <Input
            label="Username"
            required
            value={form.username}
            error={fieldErrors.username}
            onChange={(e) => update('username', e.target.value)}
            placeholder="john_doe"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Phone"
              type="tel"
              value={form.phone}
              error={fieldErrors.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="0712 345 678"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              error={fieldErrors.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </div>
          <Input
            label="MAC address"
            value={form.macAddress}
            error={fieldErrors.macAddress}
            onChange={(e) => update('macAddress', e.target.value)}
            placeholder="aa:bb:cc:dd:ee:ff"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Plan"
              value={form.planId}
              onChange={(e) => update('planId', e.target.value)}
            >
              <option value="">— No plan —</option>
              {plans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Input
              label="Expires at"
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => update('expiresAt', e.target.value)}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={renewOpen}
        onClose={() => !renewing && setRenewOpen(false)}
        title={`Renew ${selectedIds.length} customer(s)`}
        size="sm"
        dismissible={!renewing}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenewOpen(false)} disabled={renewing}>
              Cancel
            </Button>
            <Button loading={renewing} onClick={confirmBulkRenew}>
              Renew
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          The new expiry stacks on top of each customer's current expiry — no unused time is lost.
        </p>
        <Select
          label="Plan to renew into"
          value={renewPlanId}
          onChange={(e) => setRenewPlanId(e.target.value)}
        >
          <option value="">Select a plan…</option>
          {plans.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Modal>

      <ConfirmDialog
        open={!!suspending}
        onClose={() => setSuspending(null)}
        onConfirm={confirmSuspend}
        title="Suspend customer?"
        description={
          suspending
            ? `"${suspending.username}" will be disconnected from the router and cannot log in until activated again.`
            : ''
        }
        confirmLabel="Suspend"
        danger
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete customer?"
        description={
          deleting
            ? `"${deleting.username}" will be permanently removed. Active sessions are not interrupted.`
            : ''
        }
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}