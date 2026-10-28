import { useEffect, useMemo, useState } from 'react';
import { Ticket, Plus, RefreshCw, Printer, Copy, Download } from 'lucide-react';
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
import { listVouchers, generateVouchers, revokeVoucher } from '../../api/vouchers';
import { listPlans } from '../../api/plans';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { validateVoucherGenerate } from '../../utils/validators';
import { formatDate, formatVoucherCode } from '../../utils/format';

const EMPTY_GEN = {
  planId: '',
  count: 10,
  expiresAt: '',
  batchId: '',
};

function downloadCsv(codes, filename) {
  const csv = 'code\n' + codes.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Vouchers() {
  const { toast } = useToast();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [codeFilter, setCodeFilter] = useState('');
  const [plans, setPlans] = useState([]);

  const [genOpen, setGenOpen] = useState(false);
  const [genForm, setGenForm] = useState(EMPTY_GEN);
  const [genFieldErrors, setGenFieldErrors] = useState({});
  const [generating, setGenerating] = useState(false);

  const [generatedBatch, setGeneratedBatch] = useState(null);
  const [revoking, setRevoking] = useState(null);

  async function load(page = meta.page, limit = meta.limit) {
    setLoading(true);
    try {
      const { data } = await listVouchers({
        page,
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
        code: codeFilter || undefined,
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

  useEffect(() => {
    listPlans({ limit: 100, status: 'active' })
      .then(({ data }) => setPlans(data.data || []))
      .catch(() => {});
  }, []);

  function openGenerate() {
    setGenForm(EMPTY_GEN);
    setGenFieldErrors({});
    setGenOpen(true);
  }

  function closeGenerate() {
    if (generating) return;
    setGenOpen(false);
  }

  function updateGen(key, value) {
    setGenForm((f) => ({ ...f, [key]: value }));
    setGenFieldErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submitGenerate(e) {
    e.preventDefault();
    const validation = validateVoucherGenerate(genForm);
    if (!validation.ok) {
      setGenFieldErrors(validation.errors);
      return;
    }
    setGenerating(true);
    try {
      const payload = {
        planId: genForm.planId,
        count: Number(genForm.count),
      };
      if (genForm.expiresAt) payload.expiresAt = new Date(genForm.expiresAt).toISOString();
      if (genForm.batchId) payload.batchId = genForm.batchId;
      const { data } = await generateVouchers(payload);
      const result = data?.data;
      setGeneratedBatch({
        batchId: result?.batchId || genForm.batchId || '',
        codes: result?.codes || [],
        expiresAt: result?.expiresAt,
        count: result?.count ?? genForm.count,
      });
      setGenOpen(false);
      load(1, meta.limit);
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setGenerating(false);
    }
  }

  function handlePrint() {
    if (!generatedBatch) return;
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) {
      toast.error('Pop-up blocked', { message: 'Allow pop-ups to print vouchers.' });
      return;
    }
    const html = `
      <html><head><title>Vouchers — ${generatedBatch.batchId}</title>
      <style>
        body{font-family:ui-monospace,Menlo,monospace;padding:24px;line-height:1.6}
        h1{font-size:16px;margin:0 0 4px}
        p{font-size:11px;color:#555;margin:0 0 16px}
        .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
        .card{border:1px dashed #999;padding:10px 12px;border-radius:6px;text-align:center;font-size:14px;font-weight:600}
        @media print{.card{page-break-inside:avoid}}
      </style></head><body>
        <h1>Voucher batch ${generatedBatch.batchId || '—'}</h1>
        <p>${generatedBatch.codes.length} codes · ${generatedBatch.expiresAt ? 'Expires ' + new Date(generatedBatch.expiresAt).toLocaleDateString() : 'No expiry'}</p>
        <div class="grid">
          ${generatedBatch.codes.map((c) => `<div class="card">${formatVoucherCode(c)}</div>`).join('')}
        </div>
      </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  async function handleCopy() {
    if (!generatedBatch) return;
    try {
      await navigator.clipboard.writeText(generatedBatch.codes.join('\n'));
      toast.success('Codes copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  function handleCsv() {
    if (!generatedBatch) return;
    downloadCsv(
      generatedBatch.codes,
      `vouchers-${generatedBatch.batchId || 'batch'}.csv`
    );
  }

  function closeBatch() {
    setGeneratedBatch(null);
  }

  async function confirmRevoke() {
    if (!revoking) return;
    try {
      await revokeVoucher(revoking.code);
      toast.success('Voucher revoked');
      setRevoking(null);
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    }
  }

  const columns = useMemo(
    () => [
      { key: 'code', header: 'Code', render: (v) => formatVoucherCode(v.code) },
      { key: 'plan', header: 'Plan', render: (v) => v.planId?.name || '—' },
      { key: 'status', header: 'Status', render: (v) => <StatusBadge status={v.status} /> },
      {
        key: 'expires',
        header: 'Expires',
        render: (v) => (v.expiresAt ? formatDate(v.expiresAt) : '—'),
      },
      {
        key: 'batch',
        header: 'Batch',
        render: (v) => v.batchId || '—',
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (v) =>
          v.status === 'unused' ? (
            <button
              onClick={() => setRevoking(v)}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Revoke
            </button>
          ) : null,
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Vouchers"
        description="Prepaid access codes. Each voucher is single-use."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openGenerate}>
            Generate vouchers
          </Button>
        }
      />

      <Card padding="md" className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={codeFilter}
            onChange={(e) => setCodeFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(1, meta.limit)}
            placeholder="Search by code…"
            className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100 w-full sm:w-56"
          />
          <Button variant="secondary" size="sm" onClick={() => load(1, meta.limit)}>
            Search
          </Button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm text-slate-900 dark:text-slate-100"
          >
            <option value="all">All statuses</option>
            <option value="unused">Unused</option>
            <option value="used">Used</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
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
        getRowId={(v) => v._id}
        loading={loading}
        empty={
          <EmptyState
            icon={<Ticket className="h-8 w-8" />}
            title="No vouchers yet"
            description="Generate your first batch to start selling access codes."
            action={<Button onClick={openGenerate}>Generate vouchers</Button>}
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
        open={genOpen}
        onClose={closeGenerate}
        title="Generate vouchers"
        size="md"
        dismissible={!generating}
        footer={
          <>
            <Button variant="secondary" onClick={closeGenerate} disabled={generating}>
              Cancel
            </Button>
            <Button form="voucher-gen-form" type="submit" loading={generating}>
              Generate
            </Button>
          </>
        }
      >
        <form id="voucher-gen-form" onSubmit={submitGenerate} className="space-y-4">
          <Select
            label="Plan"
            required
            value={genForm.planId}
            error={genFieldErrors.planId}
            onChange={(e) => updateGen('planId', e.target.value)}
          >
            <option value="">Select a plan…</option>
            {plans.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Count"
              type="number"
              required
              min={1}
              max={1000}
              value={genForm.count}
              error={genFieldErrors.count}
              onChange={(e) => updateGen('count', e.target.value)}
            />
            <Input
              label="Expires at"
              type="datetime-local"
              hint="Leave blank for default (30 days)"
              value={genForm.expiresAt}
              error={genFieldErrors.expiresAt}
              onChange={(e) => updateGen('expiresAt', e.target.value)}
            />
          </div>
          <Input
            label="Batch ID"
            hint="Optional label for tracking this batch"
            value={genForm.batchId}
            onChange={(e) => updateGen('batchId', e.target.value)}
            placeholder="batch_dec_promo"
          />
        </form>
      </Modal>

      <Modal
        open={!!generatedBatch}
        onClose={() => {}}
        title="Vouchers generated"
        size="lg"
        dismissible={false}
        footer={
          <Button onClick={closeBatch}>Done</Button>
        }
      >
        {generatedBatch && (
          <div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300 mb-4">
              These codes will not be shown again. Print, copy, or download them now.
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {generatedBatch.codes.length} codes
              </span>
              {generatedBatch.batchId && <span>· Batch {generatedBatch.batchId}</span>}
              {generatedBatch.expiresAt && (
                <span>· Expires {formatDate(generatedBatch.expiresAt)}</span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              {generatedBatch.codes.map((c) => (
                <div
                  key={c}
                  className="px-2 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-center text-slate-900 dark:text-slate-100"
                >
                  {formatVoucherCode(c)}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Printer className="h-3.5 w-3.5" />}
                onClick={handlePrint}
              >
                Print
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Copy className="h-3.5 w-3.5" />}
                onClick={handleCopy}
              >
                Copy all
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Download className="h-3.5 w-3.5" />}
                onClick={handleCsv}
              >
                Download CSV
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={confirmRevoke}
        title="Revoke voucher?"
        description={
          revoking
            ? `Voucher ${formatVoucherCode(revoking.code)} will no longer be redeemable.`
            : ''
        }
        confirmLabel="Revoke"
        danger
      />
    </div>
  );
}