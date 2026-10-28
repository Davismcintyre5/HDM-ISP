import { useEffect, useMemo, useState } from 'react';
import { Router as RouterIcon, Plus, RefreshCw, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Input from '../../components/ui/Input';
import StatusBadge from '../../components/ui/StatusBadge';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import {
  listRouters,
  createRouter,
  updateRouter,
  deleteRouter,
  testRouter,
} from '../../api/routers';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { validateRouter } from '../../utils/validators';
import { formatRelative } from '../../utils/format';

const EMPTY_FORM = {
  name: '',
  ipAddress: '',
  apiPort: 8728,
  apiUsername: '',
  apiPassword: '',
  radiusSecret: '',
  siteName: '',
};

export default function Routers() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [testingId, setTestingId] = useState(null);

  async function load(page = meta.page, limit = meta.limit) {
    setLoading(true);
    try {
      const { data } = await listRouters({
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

  function openEdit(r) {
    setForm({
      name: r.name || '',
      ipAddress: r.ipAddress || '',
      apiPort: r.apiPort ?? 8728,
      apiUsername: r.apiUsername || '',
      apiPassword: '',
      radiusSecret: '',
      siteName: r.siteName || '',
    });
    setFieldErrors({});
    setEditing(r._id);
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

  async function save(e) {
    e.preventDefault();
    const validation = validateRouter(form, { isEdit: editing !== 'new' });
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      return;
    }
    setSubmitting(true);
    try {
      if (editing === 'new') {
        await createRouter({
          name: form.name.trim(),
          ipAddress: form.ipAddress.trim(),
          apiPort: Number(form.apiPort),
          apiUsername: form.apiUsername.trim(),
          apiPassword: form.apiPassword,
          radiusSecret: form.radiusSecret,
          siteName: form.siteName.trim() || undefined,
        });
        toast.success('Router added');
      } else {
        const payload = {
          name: form.name.trim(),
          ipAddress: form.ipAddress.trim(),
          apiPort: Number(form.apiPort),
          apiUsername: form.apiUsername.trim(),
          siteName: form.siteName.trim() || undefined,
        };
        if (form.apiPassword) payload.apiPassword = form.apiPassword;
        if (form.radiusSecret) payload.radiusSecret = form.radiusSecret;
        await updateRouter(editing, payload);
        toast.success('Router updated');
      }
      setEditing(null);
      load();
    } catch (err) {
      const e2 = errors.fromAxios(err);
      if (e2.status === 409) setFieldErrors({ ipAddress: e2.message });
      else toast.error(e2.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTest(r) {
    setTestingId(r._id);
    try {
      const { data } = await testRouter(r._id);
      const ok = data?.data?.ok;
      if (ok) toast.success('Connection OK', { message: r.name });
      else toast.error('Connection failed', { message: data?.data?.error || 'Unknown error' });
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setTestingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteRouter(deleting._id);
      toast.success('Router deleted');
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    }
  }

  const columns = useMemo(
    () => [
      { key: 'name', header: 'Name' },
      {
        key: 'endpoint',
        header: 'Endpoint',
        render: (r) => `${r.ipAddress}:${r.apiPort ?? 8728}`,
      },
      { key: 'siteName', header: 'Site', render: (r) => r.siteName || '—' },
      { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
      {
        key: 'lastSeen',
        header: 'Last seen',
        render: (r) => formatRelative(r.lastSeenAt),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (r) => (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handleTest(r)}
              disabled={testingId === r._id}
              className="text-sm text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50 inline-flex items-center gap-1"
            >
              {testingId === r._id ? <Spinner size="sm" /> : <Zap className="h-3.5 w-3.5" />}
              Test
            </button>
            <button
              onClick={() => navigate(`/routers/${r._id}`, { state: { router: r } })}
              className="text-sm text-slate-700 dark:text-slate-300 hover:underline"
            >
              Sessions
            </button>
            <button
              onClick={() => openEdit(r)}
              className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
            >
              Edit
            </button>
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
    [testingId]
  );

  return (
    <div>
      <PageHeader
        title="Routers"
        description="MikroTik devices that serve your hotspot and enforce plan limits."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Add router
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
            <option value="all">All statuses</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="unknown">Unknown</option>
          </select>
          <Button variant="secondary" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => load()}>
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
            icon={<RouterIcon className="h-8 w-8" />}
            title="No routers yet"
            description="Add your first MikroTik router to start serving hotspot customers."
            action={<Button onClick={openCreate}>Add router</Button>}
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
        title={editing === 'new' ? 'Add router' : 'Edit router'}
        size="md"
        dismissible={!submitting}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              Cancel
            </Button>
            <Button form="router-form" type="submit" loading={submitting}>
              {editing === 'new' ? 'Add router' : 'Save'}
            </Button>
          </>
        }
      >
        <form id="router-form" onSubmit={save} className="space-y-4">
          <Input
            label="Name"
            required
            value={form.name}
            error={fieldErrors.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Main Router"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="IP address"
              required
              className="sm:col-span-2"
              value={form.ipAddress}
              error={fieldErrors.ipAddress}
              onChange={(e) => update('ipAddress', e.target.value)}
              placeholder="192.168.88.1"
            />
            <Input
              label="API port"
              type="number"
              required
              value={form.apiPort}
              error={fieldErrors.apiPort}
              onChange={(e) => update('apiPort', e.target.value)}
            />
          </div>
          <Input
            label="Site name"
            value={form.siteName}
            onChange={(e) => update('siteName', e.target.value)}
            placeholder="Nairobi CBD"
          />
          <Input
            label="API username"
            required
            value={form.apiUsername}
            error={fieldErrors.apiUsername}
            onChange={(e) => update('apiUsername', e.target.value)}
            placeholder="admin"
          />
          <Input
            label="API password"
            type="password"
            required={editing === 'new'}
            autoComplete="new-password"
            value={form.apiPassword}
            error={fieldErrors.apiPassword}
            onChange={(e) => update('apiPassword', e.target.value)}
            placeholder={editing === 'new' ? '' : 'Leave blank to keep current'}
            hint={editing === 'new' ? undefined : 'Leave blank to keep current'}
          />
          <Input
            label="RADIUS secret"
            type="password"
            required={editing === 'new'}
            autoComplete="new-password"
            value={form.radiusSecret}
            error={fieldErrors.radiusSecret}
            onChange={(e) => update('radiusSecret', e.target.value)}
            placeholder={editing === 'new' ? '' : 'Leave blank to keep current'}
            hint={
              editing === 'new'
                ? 'Must match IP → RADIUS → Secret on the router'
                : 'Leave blank to keep current'
            }
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete router?"
        description={
          deleting
            ? `"${deleting.name}" will be removed. Active sessions on this router are not affected until they expire.`
            : ''
        }
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}