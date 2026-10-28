import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Smartphone,
  FileText,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  Building2,
  Wallet,
  Send,
  XCircle,
  Upload,
} from 'lucide-react';

import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import PayWithMpesaModal from '../../components/public/PayWithMpesaModal';

import { getInvoice, markInvoicePaid } from '../../api/billing';

import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';

import { errors } from '../../utils/errors';
import { formatMoney, formatDate, formatPhone } from '../../utils/format';

const METHOD_ICONS = {
  mpesa_stk: Smartphone,
  mpesa_send: Send,
  mpesa_paybill: Building2,
  mpesa_till: Wallet,
  bank: Building2,
  cash: Wallet,
};

function Row({ label, value, mono, bold, valueClass, truncate }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={[
          'text-right text-sm',
          bold ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-900 dark:text-slate-100',
          mono ? 'font-mono text-xs' : '',
          truncate ? 'truncate' : '',
          valueClass || '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </span>
    </div>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { siteSettings } = useSite();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mpesaOpen, setMpesaOpen] = useState(false);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualRef, setManualRef] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const supportEmail = siteSettings?.['support.email'] || 'support@hdm.co.ke';
  const supportPhone = siteSettings?.['support.phone'] || '254768784909';

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await getInvoice(id);
      setInvoice(data.data);
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function submitManualPaid() {
    setManualSubmitting(true);
    try {
      await markInvoicePaid(invoice._id, {
        reference: manualRef.trim() || undefined,
        note: manualNote.trim() || undefined,
      });
      toast.success('Submitted. An admin will confirm your payment shortly.');
      setManualOpen(false);
      setManualRef('');
      setManualNote('');
      load(false);
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setManualSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-16 grid place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!invoice) {
    return (
      <EmptyState
        title="Invoice not found"
        action={<Button onClick={() => navigate('/billing/invoices')}>Back to invoices</Button>}
      />
    );
  }

  const isPaid = invoice.status === 'paid';
  const isCancelled = invoice.status === 'cancelled';
  const amountDue = invoice.amountDue ?? invoice.total ?? 0;
  const pendingTx = invoice.pendingTransaction;
  const awaitingConfirmation = Boolean(pendingTx);
  const canPay = !isPaid && !isCancelled && !awaitingConfirmation && amountDue > 0;
  const invoiceNumber = invoice.invoiceNumber || invoice.number || '—';

  const rawInstructions = Array.isArray(invoice.paymentInstructions)
    ? invoice.paymentInstructions
    : [];

  const manualMethods = rawInstructions.filter(
    (p) => p.code && p.code !== 'mpesa_stk'
  );

  const planName =
    invoice.items?.[0]?.description ||
    invoice.items?.[0]?.name ||
    invoice.purpose ||
    'Subscription';

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => navigate('/billing/invoices')}
          className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Back to invoices
        </button>
      </div>

      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <div className="text-center">
            <div
              className={[
                'mx-auto flex h-16 w-16 items-center justify-center rounded-full',
                isPaid
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : isCancelled
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : awaitingConfirmation
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30',
              ].join(' ')}
            >
              {isPaid ? (
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              ) : isCancelled ? (
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              ) : awaitingConfirmation ? (
                <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              ) : (
                <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              )}
            </div>

            <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {isPaid
                ? 'Invoice paid'
                : isCancelled
                ? 'Invoice cancelled'
                : awaitingConfirmation
                ? 'Awaiting confirmation'
                : 'Payment required'}
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {isPaid ? (
                <>Your payment for <strong className="text-slate-900 dark:text-slate-100">{planName}</strong> has been received. Your subscription is active.</>
              ) : isCancelled ? (
                <>This invoice was cancelled. Open your billing page to generate a new one.</>
              ) : awaitingConfirmation ? (
                <>Your payment for <strong className="text-slate-900 dark:text-slate-100">{planName}</strong> was submitted. An admin will verify and activate your plan shortly.</>
              ) : (
                <>Pay this invoice to activate <strong className="text-slate-900 dark:text-slate-100">{planName}</strong> on your account.</>
              )}
            </p>
          </div>

          <div className="mt-6 space-y-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
            <Row label="Invoice" value={invoiceNumber} mono bold />
            <Row label="Plan" value={planName} />
            <Row label="Issued" value={formatDate(invoice.issuedAt)} />
            <Row label="Due" value={formatDate(invoice.dueDate)} />
            <Row
              label="Amount due"
              value={formatMoney(amountDue, invoice.currency)}
              bold
              valueClass="text-lg text-slate-900 dark:text-slate-100"
            />
            <Row
              label="Status"
              value={
                isPaid
                  ? 'Paid'
                  : isCancelled
                  ? 'Cancelled'
                  : awaitingConfirmation
                  ? 'Awaiting confirmation'
                  : invoice.status === 'overdue'
                  ? 'Overdue'
                  : 'Unpaid'
              }
              valueClass={
                isPaid
                  ? 'font-semibold text-green-600 dark:text-green-400'
                  : isCancelled
                  ? 'font-semibold text-red-600 dark:text-red-400'
                  : awaitingConfirmation
                  ? 'font-semibold text-blue-600 dark:text-blue-400'
                  : 'font-semibold text-amber-600 dark:text-amber-400'
              }
            />
          </div>

          {awaitingConfirmation && (
            <div className="mt-6 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-900/20 p-4">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-300">
                    Payment submitted
                  </p>
                  {pendingTx.reference && (
                    <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-400">
                      Reference: <span className="font-mono">{pendingTx.reference}</span>
                    </p>
                  )}
                  {pendingTx.note && (
                    <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-400">
                      Note: {pendingTx.note}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-blue-700 dark:text-blue-400">
                    Submitted {formatDate(pendingTx.submittedAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2.5">
            {canPay && (
              <Button
                fullWidth
                size="lg"
                leftIcon={<Smartphone className="h-4 w-4" />}
                onClick={() => setMpesaOpen(true)}
              >
                Pay {formatMoney(amountDue, invoice.currency)} with M-Pesa
              </Button>
            )}

            <Button
              fullWidth
              variant="secondary"
              size="lg"
              onClick={() => load(false)}
              loading={refreshing}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Check status
            </Button>

            <Button
              fullWidth
              variant="ghost"
              onClick={() => navigate('/billing')}
              leftIcon={<FileText className="h-4 w-4" />}
            >
              Back to billing
            </Button>
          </div>

          {canPay && manualMethods.length > 0 && (
            <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Other ways to pay
              </p>
              <ul className="mt-3 space-y-3">
                {manualMethods.map((p, i) => {
                  const Icon = METHOD_ICONS[p.code] || Wallet;
                  const recipient = p.recipient || {};
                  const recipientEntries = Object.entries(recipient).filter(
                    ([, v]) => v !== null && v !== undefined && v !== ''
                  );

                  return (
                    <li
                      key={`${p.code || p.title}-${i}`}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {p.title}
                          </p>
                          {p.description && (
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {p.description}
                            </p>
                          )}

                          {recipientEntries.length > 0 ? (
                            <div className="mt-2 space-y-0.5">
                              {recipientEntries.map(([k, v]) => (
                                <p key={k} className="text-xs text-slate-900 dark:text-slate-100">
                                  <span className="capitalize text-slate-500 dark:text-slate-400">
                                    {k}:
                                  </span>{' '}
                                  <span className="font-mono font-medium">{String(v)}</span>
                                </p>
                              ))}
                            </div>
                          ) : p.payTo ? (
                            <p className="mt-1 font-mono text-xs text-slate-900 dark:text-slate-100">
                              {p.payTo}
                            </p>
                          ) : null}

                          {p.steps && p.steps.length > 0 && (
                            <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-xs text-slate-500 dark:text-slate-400">
                              {p.steps.map((s, j) => (
                                <li key={j}>{s}</li>
                              ))}
                            </ol>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Already paid with one of these methods?
                </p>
                <Button
                  fullWidth
                  variant="secondary"
                  size="md"
                  className="mt-2"
                  leftIcon={<Upload className="h-4 w-4" />}
                  onClick={() => setManualOpen(true)}
                >
                  I've paid — notify admin
                </Button>
              </div>
            </div>
          )}

          {isPaid && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-green-200 dark:border-green-900/60 bg-green-50 dark:bg-green-900/20 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
              <div className="text-sm">
                <p className="font-medium text-green-800 dark:text-green-300">Payment received</p>
                <p className="mt-0.5 text-xs text-green-700 dark:text-green-400">
                  Your subscription is active. You can continue using the dashboard.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-5">
            <p className="text-center text-xs font-medium text-slate-500 dark:text-slate-400">
              Need help?
            </p>
            <div className="mt-2 flex flex-col items-center gap-1.5 text-xs">
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-1.5 font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                <Mail className="h-3 w-3" /> {supportEmail}
              </a>
              <a
                href={`tel:+${supportPhone.replace(/\D/g, '')}`}
                className="inline-flex items-center gap-1.5 font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                <Phone className="h-3 w-3" /> {formatPhone(supportPhone)}
              </a>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          STK payments are confirmed automatically. Manual payments are verified by an admin.
        </p>
      </div>

      {canPay && (
        <PayWithMpesaModal
          open={mpesaOpen}
          onClose={() => setMpesaOpen(false)}
          invoiceId={invoice._id}
          invoiceNumber={invoiceNumber}
          amount={amountDue}
          currency={invoice.currency}
          onSuccess={() => load(false)}
        />
      )}

      <Modal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title="Confirm manual payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setManualOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitManualPaid} loading={manualSubmitting}>
              Submit
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Confirm you have paid invoice <strong>{invoiceNumber}</strong> for{' '}
            <strong>{formatMoney(amountDue, invoice.currency)}</strong>. An admin will verify and activate your plan.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reference (optional)
            </label>
            <input
              type="text"
              value={manualRef}
              onChange={(e) => setManualRef(e.target.value)}
              placeholder="M-Pesa code, bank transaction ID, or cash receipt"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Note (optional)
            </label>
            <textarea
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              rows={2}
              placeholder="e.g. Paid via bank transfer to KCB on 28 Oct"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm resize-y"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}