import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';
import { getLegalByType } from '../../api/site';
import { errors } from '../../utils/errors';
import { formatDate } from '../../utils/format';

const VARIANT_TO_TYPE = {
  terms: 'terms',
  privacy: 'privacy',
  refund: 'refund',
  cookies: 'privacy',
  aup: 'aup',
};

const cache = new Map();

async function fetchLegal(type) {
  if (cache.has(type)) return cache.get(type);
  const { data } = await getLegalByType(type);
  cache.set(type, data.data);
  return data.data;
}

const MD_COMPONENTS = {
  h1: ({ children }) => (
    <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-5 first:mt-0 mb-2">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-4 mb-2">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-3 mb-1.5">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed my-2">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 my-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-brand-600 dark:text-brand-400 hover:underline"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900 dark:text-slate-100">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200">
      {children}
    </code>
  ),
};

export default function LegalModal({ open, variant = 'terms', onClose }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const type = VARIANT_TO_TYPE[variant] || 'terms';

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setDoc(null);
    setLoading(true);

    fetchLegal(type)
      .then((d) => {
        if (!cancelled) setDoc(d);
      })
      .catch((e) => {
        if (!cancelled) setError(errors.fromAxios(e).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, type]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={doc?.title || 'Legal'}
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {loading && (
        <div className="py-8 grid place-items-center">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && error && (
        <EmptyState
          title="Could not load document"
          description={error}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                cache.delete(type);
                setError(null);
                setDoc(null);
                setLoading(true);
                fetchLegal(type)
                  .then((d) => setDoc(d))
                  .catch((e) => setError(errors.fromAxios(e).message))
                  .finally(() => setLoading(false));
              }}
            >
              Retry
            </Button>
          }
        />
      )}

      {!loading && !error && !doc && (
        <EmptyState
          title="Document unavailable"
          description="This document is not published yet. Please try again later."
        />
      )}

      {!loading && !error && doc && (
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {doc.version ? `v${doc.version} · ` : ''}
            Effective {formatDate(doc.effectiveFrom || doc.createdAt)}
          </p>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
            {doc.content || ''}
          </ReactMarkdown>
        </div>
      )}
    </Modal>
  );
}