import { useEffect, useMemo, useState } from 'react';
import { Package, Plus } from 'lucide-react';
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
import { listPlans, createPlan, updatePlan, archivePlan } from '../../api/plans';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { validatePlan } from '../../utils/validators';
import {
  formatMoney,
  formatRateLimit,
  formatValidity,
  formatDataCap,
  formatMbpsToKbps,
  formatKbpsToMbps,
} from '../../utils/format';

const EMPTY_FORM = {
  name: '',
  type: 'hotspot',
  price: '',
  currency: 'KES',
  validityUnit: 'days',
  validityValue: 1,
  rateLimitDownKbps: 5000,
  rateLimitUpKbps: 5000,
  dataCapMb: 0,
};

function planToForm(plan) {
  return {
    name: plan.name || '',
    type: plan.type || 'hotspot',
    price: plan.price ?? '',
    currency: plan.currency || 'KES',
    validityUnit: plan.validityUnit || 'days',
    validityValue: plan.validityValue ?? 1,
    rateLimitDownKbps: plan.rateLimitDownKbps ?? 0,
    rateLimitUpKbps: plan.rateLimitUpKbps ?? 0,
    dataCapMb: plan.dataCapMb ?? 0,
  };
}

export default function Plans() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(null);

  async function load(page = meta.page, limit = meta.limit) {
    setLoading(true);
    try {
      const { data } = await listPlans({
        page,
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
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
  }, [statusFilter]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setEditing('new');
  }

  function openEdit(plan) {
    setForm(planToForm(plan));
    setFieldErrors({});
    setEditing(plan._id);
  }

  function closeModal() {
    if (submitting) return;
    setEditing(null);
    setFieldErrors({});
  }

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((e) => ({ ...e, [key]: undefined }));
  }

  function updateRate(direction, mbps) {
    const kbps = formatMbpsToKbps(mbps);
    setForm((f) => ({
      ...f,
      [direction === 'down' ? 'rateLimitDownKbps' : 'rateLimitUpKbps']: kbps,
    }));
  }

  async function save(e) {
    e.preventDefault();
    const validation = validatePlan({
      ...form,
      price: Number(form.price),
      validityValue: Number(form.validityValue),
      rateLimitDownKbps: Number(form.rateLimitDownKbps),
      rateLimitUpKbps: Number(form.rateLimitUpKbps),
      dataCapMb: Number(form.dataCapMb),
    });
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        price: Number(form.price),
        currency: form.currency,
        validityUnit: form.validityUnit,
        validityValue: Number(form.validityValue),
        rateLimitDownKbps: Number(form.rateLimitDownKbps),
        rateLimitUpKbps: Number(form.rateLimitUpKbps),
        dataCapMb: Number(form.dataCapMb),
      };
      if (editing === 'new') await createPlan(payload);
      else await updatePlan(editing, payload);
      toast.success(editing === 'new' ? 'Plan created' : 'Plan updated');
      setEditing(null);
      load();
    } catch (err) {
      const e2 = errors.fromAxios(err);
      if (e2.status === 409) setFieldErrors({ name: e2.message });
      else toast.error(e2.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmArchive() {
    if (!archiving) return;
    try {
      await archivePlan(archiving._id);
      toast.success('Plan archived');
      setArchiving(null);
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    }
  }

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Name' },
      { key: 'type', header: 'Type', render: (p) => p.type },
      { key: 'price', header: 'Price', render: (p) => formatMoney(p.price, p.currency) },
      {
        key: 'validity',
        header: 'Validity',
        render: (p) => formatValidity(p.validityValue, p.validityUnit),
      },
      {
        key: 'rate',
        header: 'Down / Up',
        render: (p) =>
          `${formatRateLimit(p.rateLimitDownKbps)} / ${formatRateLimit(p.rateLimitUpKbps)}`,
      },
      {
        key: 'dataCap',
        header: 'Data cap',
        render: (p) => formatDataCap(p.dataCapMb),
      },
      {
        key: 'status',
        header: 'Status',
        render: (p) => <StatusBadge status={p.status} />,
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (p) => (
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => openEdit(p)}
              className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
            >
              Edit
            </button>
            {p.status !== 'archived' && (
              <button
                onClick={() => setArchiving(p)}
                className="text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Archive
              </button>
            )}
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Plans"
        description="Plans define what customers buy: speed, validity, and price."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            New plan
          </Button>
        }
      />

      <Card padding="md" className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
          <Button variant="secondary" size="sm" onClick={() => load()}>
            Refresh
          </Button>
        </div>
      </Card>

      <Table
        columns={columns}
        rows={rows}
        getRowId={(p) => p._id}
        loading={loading}
        empty={
          <EmptyState
            icon={<Package className="h-8 w-8" />}
            title="No plans yet"
            description="Create your first plan to start selling vouchers."
            action={<Button onClick={openCreate}>Create plan</Button>}
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
        open={!!editing}
        onClose={closeModal}
        title={editing === 'new' ? 'Create plan' : 'Edit plan'}
        size="md"
        dismissible={!submitting}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              Cancel
            </Button>
            <Button form="plan-form" type="submit" loading={submitting}>
              {editing === 'new' ? 'Create' : 'Save'}
            </Button>
          </>
        }
      >
        <form id="plan-form" onSubmit={save} className="space-y-4">
          <Input
            label="Plan name"
            required
            value={form.name}
            error={fieldErrors.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Daily 5Mbps"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Price"
              type="number"
              required
              min={0}
              step="0.01"
              value={form.price}
              error={fieldErrors.price}
              onChange={(e) => update('price', e.target.value)}
            />
            <Select
              label="Currency"
              value={form.currency}
              onChange={(e) => update('currency', e.target.value)}
            >
              <option value="KES">KES</option>
              <option value="USD">USD</option>
            </Select>
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => update('type', e.target.value)}
            >
              <option value="hotspot">Hotspot</option>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Validity"
              type="number"
              required
              min={1}
              value={form.validityValue}
              error={fieldErrors.validityValue}
              onChange={(e) => update('validityValue', e.target.value)}
            />
            <Select
              label="Unit"
              value={form.validityUnit}
              error={fieldErrors.validityUnit}
              onChange={(e) => update('validityUnit', e.target.value)}
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="months">Months</option>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Download (Mbps)"
              type="number"
              min={0}
              step="0.1"
              value={formatKbpsToMbps(form.rateLimitDownKbps)}
              onChange={(e) => updateRate('down', e.target.value)}
            />
            <Input
              label="Upload (Mbps)"
              type="number"
              min={0}
              step="0.1"
              value={formatKbpsToMbps(form.rateLimitUpKbps)}
              onChange={(e) => updateRate('up', e.target.value)}
            />
          </div>
          <Input
            label="Data cap (MB)"
            type="number"
            min={0}
            hint="0 = unlimited"
            value={form.dataCapMb}
            error={fieldErrors.dataCapMb}
            onChange={(e) => update('dataCapMb', e.target.value)}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!archiving}
        onClose={() => setArchiving(null)}
        onConfirm={confirmArchive}
        title="Archive plan?"
        description={
          archiving
            ? `"${archiving.name}" will be hidden from new sales. Existing customers keep their plan.`
            : ''
        }
        confirmLabel="Archive"
        danger
      />
    </div>
  );
}