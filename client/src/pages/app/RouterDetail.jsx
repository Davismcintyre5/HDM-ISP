import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Zap } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { getRouterSessions, listRouters, testRouter } from '../../api/routers';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { formatRelative } from '../../utils/format';

export default function RouterDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [router, setRouter] = useState(location.state?.router || null);
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [testing, setTesting] = useState(false);

  async function loadRouter() {
    if (router) return;
    try {
      const { data } = await listRouters({ limit: 100 });
      const found = (data.data || []).find((r) => r._id === id);
      if (found) setRouter(found);
    } catch {
      /* silent */
    }
  }

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const { data } = await getRouterSessions(id);
      setSessions(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    loadRouter();
    loadSessions();
  }, [id]);

  async function handleTest() {
    setTesting(true);
    try {
      const { data } = await testRouter(id);
      const ok = data?.data?.ok;
      if (ok) toast.success('Connection OK');
      else toast.error('Connection failed', { message: data?.data?.error || 'Unknown error' });
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setTesting(false);
    }
  }

  const columns = useMemo(
    () => [
      { key: 'user', header: 'User', render: (s) => s.user || s['name'] || '—' },
      { key: 'address', header: 'Address', render: (s) => s.address || '—' },
      { key: 'uptime', header: 'Uptime', render: (s) => s.uptime || '—' },
      { key: 'mac', header: 'MAC', render: (s) => s['mac-address'] || '—' },
    ],
    []
  );

  return (
    <div>
      <div className="mb-3">
        <button
          onClick={() => navigate('/routers')}
          className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Back to routers
        </button>
      </div>

      <PageHeader
        title={router?.name || 'Router'}
        description={router ? `${router.ipAddress}:${router.apiPort}${router.siteName ? ' · ' + router.siteName : ''}` : undefined}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={loadSessions}
              disabled={loadingSessions}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              leftIcon={testing ? <Spinner size="sm" /> : <Zap className="h-4 w-4" />}
              onClick={handleTest}
              disabled={testing}
            >
              Test connection
            </Button>
          </div>
        }
      />

      {router && (
        <Card padding="md" className="mb-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <StatusBadge status={router.status} />
            {router.lastSeenAt && (
              <span className="text-slate-500 dark:text-slate-400">
                Last seen {formatRelative(router.lastSeenAt)}
              </span>
            )}
            <span className="text-slate-500 dark:text-slate-400">
              API user: <span className="font-medium text-slate-700 dark:text-slate-200">{router.apiUsername}</span>
            </span>
          </div>
        </Card>
      )}

      <Card padding="md">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Active sessions
        </div>
        <Table
          columns={columns}
          rows={sessions}
          getRowId={(s) => s['.id'] || s.user || Math.random()}
          loading={loadingSessions}
          empty={
            <EmptyState
              title="No active sessions"
              description="Customers appear here as they connect to the hotspot."
            />
          }
        />
      </Card>
    </div>
  );
}