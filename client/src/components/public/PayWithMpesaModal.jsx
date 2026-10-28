import { useEffect, useRef, useState } from 'react';
import { Smartphone } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { payInvoiceStk, getPaymentStatus } from '../../api/billing';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { sanitizePhone } from '../../utils/format';

export default function PayWithMpesaModal({
  open,
  onClose,
  invoiceId,
  invoiceNumber,
  amount,
  currency,
  onSuccess,
}) {
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [paying, setPaying] = useState(false);
  const [polling, setPolling] = useState(false);
  const [checkoutId, setCheckoutId] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      setPolling(false);
      setCheckoutId(null);
      setPhone('');
    }
  }, [open]);

  function startPolling(checkout) {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const { data } = await getPaymentStatus(checkout);
        const status = data.data.status;
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setPolling(false);
          setCheckoutId(null);
          if (status === 'completed') {
            toast.success('Payment received');
            onSuccess?.();
            onClose?.();
          } else {
            toast.error(
              status === 'cancelled' ? 'Payment cancelled' : 'Payment failed',
              { message: data.data.resultDesc || 'Please try again.' }
            );
          }
        }
      } catch {
        /* keep polling */
      }
      if (attempts > 100) {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setPolling(false);
      }
    }, 3000);
  }

  async function submit(e) {
    e.preventDefault();
    const normalized = sanitizePhone(phone);
    if (!normalized) {
      toast.error('Enter a valid M-Pesa phone number');
      return;
    }
    setPaying(true);
    try {
      const { data } = await payInvoiceStk(invoiceId, normalized);
      setCheckoutId(data.data.checkoutRequestId);
      toast.success('Check your phone', {
        message: 'Enter your M-Pesa PIN to complete the payment.',
      });
      setPolling(true);
      startPolling(data.data.checkoutRequestId);
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setPaying(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !polling && onClose?.()}
      title={polling ? 'Waiting for M-Pesa' : 'Pay with M-Pesa'}
      size="sm"
      dismissible={!polling}
      footer={
        polling ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button form="mpesa-form" type="submit" loading={paying}>
              Send STK push
            </Button>
          </>
        )
      }
    >
      {polling ? (
        <div className="py-4 text-center space-y-3">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Smartphone className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Waiting for M-Pesa confirmation…
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter your PIN on your phone. This dialog updates automatically.
            </p>
          </div>
          {checkoutId && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono break-all">
              {checkoutId}
            </p>
          )}
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <form id="mpesa-form" onSubmit={submit} className="space-y-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-slate-500 dark:text-slate-400">Invoice</span>
              <span className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100">
                {invoiceNumber || '—'}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3 mt-1">
              <span className="text-slate-500 dark:text-slate-400">Amount</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {currency} {Number(amount).toLocaleString('en-KE')}
              </span>
            </div>
          </div>
          <Input
            label="M-Pesa phone number"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712 345 678"
            hint="Supported: 0712 345 678, 254712345678, or +254 712 345 678"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            An M-Pesa prompt will appear on your phone. Enter your PIN to complete the payment.
          </p>
        </form>
      )}
    </Modal>
  );
}