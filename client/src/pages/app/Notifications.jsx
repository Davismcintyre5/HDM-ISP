import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Switch from '../../components/ui/Switch';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../../api/notifications';
import { useSite } from '../../context/SiteContext';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { formatRelative } from '../../utils/format';

export default function Notifications() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshUnread } = useSite();

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  async function load(page = meta.page, limit = meta.limit) {
    setLoading(true);
    try {
      const { data } = await listNotifications({
        page,
        limit,
        unreadOnly: unreadOnly ? true : undefined,
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
  }, [unreadOnly]);

  async function handleRead(n) {
    if (!n.read) {
      try {
        await markNotificationRead(n._id);
        refreshUnread();
      } catch {}
    }
    if (n.link) navigate(n.link);
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      toast.success('All notifications marked read');
      refreshUnread();
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      toast.success('Notification deleted');
      refreshUnread();
      load();
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Account activity, provider events, and admin messages."
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<CheckCheck className="h-4 w-4" />}
            onClick={handleMarkAll}
          >
            Mark all read
          </Button>
        }
      />

      <Card padding="md" className="mb-3">
        <div className="flex items-center justify-between">
          <Switch
            checked={unreadOnly}
            onChange={setUnreadOnly}
            label="Unread only"
          />
        </div>
      </Card>

      {loading ? (
        <div className="py-10 grid place-items-center">
          <Spinner size="lg" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title="No notifications"
          description={unreadOnly ? 'No unread notifications.' : 'You are all caught up.'}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((n) => (
            <Card
              key={n._id}
              padding="md"
              className={!n.read ? 'border-l-4 border-l-brand-500' : ''}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleRead(n)}>
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {n.title}
                    </div>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />
                    )}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                    {n.body}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {formatRelative(n.createdAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, n._id)}
                  aria-label="Delete"
                  className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        page={meta.page}
        limit={meta.limit}
        total={meta.total}
        onPageChange={(p) => load(p, meta.limit)}
        onLimitChange={(l) => load(1, l)}
      />
    </div>
  );
}