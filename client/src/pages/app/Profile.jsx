import { useEffect, useRef, useState } from 'react';
import { Save, Upload, Trash2, KeyRound, RefreshCw } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import Avatar from '../../components/ui/Avatar';
import {
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  removeAvatar,
} from '../../api/profile';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errors } from '../../utils/errors';
import { sanitizePhone } from '../../utils/format';

export default function Profile() {
  const { toast } = useToast();
  const { provider, user, setUser, setProvider } = useAuth();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    businessName: provider?.name || '',
    phone: user?.phone || provider?.phone || '',
  });
  const [avatarUrl, setAvatarUrl] = useState(provider?.avatarUrl || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef(null);

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwdSaving, setPwdSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data } = await getProfile();
      const u = data.data.user;
      const p = data.data.provider;
      setProfile({
        name: u.name || '',
        businessName: p.name || '',
        phone: u.phone || p.phone || '',
      });
      setAvatarUrl(p.avatarUrl || '');
      setUser(u);
      setProvider(p);
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function setField(key, value) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const cleanPhone = profile.phone ? sanitizePhone(profile.phone) : null;
      const { data } = await updateProfile({
        name: profile.name.trim(),
        businessName: profile.businessName.trim(),
        phone: cleanPhone || undefined,
      });
      setUser(data.data.user);
      setProvider(data.data.provider);
      setProfile({
        name: data.data.user.name || '',
        businessName: data.data.provider.name || '',
        phone: data.data.user.phone || data.data.provider.phone || '',
      });
      setAvatarUrl(data.data.provider.avatarUrl || '');
      toast.success('Profile updated');
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setSaving(false);
    }
  }

  function pickAvatar() {
    fileInputRef.current?.click();
  }

  async function onAvatarSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2 MB');
      return;
    }
    setUploading(true);
    try {
      const { data } = await uploadAvatar(file);
      setAvatarUrl(data.data.avatarUrl);
      setProvider((p) => ({ ...(p || {}), avatarUrl: data.data.avatarUrl }));
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function onRemoveAvatar() {
    setRemoving(true);
    try {
      await removeAvatar();
      setAvatarUrl('');
      setProvider((p) => ({ ...(p || {}), avatarUrl: '' }));
      toast.success('Avatar removed');
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setRemoving(false);
    }
  }

  async function savePassword() {
    if (pwd.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (pwd.newPassword !== pwd.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setPwdSaving(true);
    try {
      await changePassword(pwd.currentPassword, pwd.newPassword);
      toast.success('Password changed');
      setPwd({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(errors.fromAxios(err).message);
    } finally {
      setPwdSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Your account details, avatar, and password."
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={load}
            disabled={loading}
          >
            Reload
          </Button>
        }
      />

      {loading ? (
        <div className="py-16 grid place-items-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-4">
          <Card padding="md">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Avatar
            </div>
            <div className="flex items-center gap-4">
              <Avatar
                name={profile.name || profile.businessName || 'P'}
                src={avatarUrl}
                size="lg"
              />
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={onAvatarSelected}
                  className="hidden"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Upload className="h-3.5 w-3.5" />}
                    onClick={pickAvatar}
                    loading={uploading}
                  >
                    Upload avatar
                  </Button>
                  {avatarUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      onClick={onRemoveAvatar}
                      loading={removing}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  PNG, JPG, WEBP, or GIF · max 2 MB
                </p>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Account details
            </div>
            <div className="space-y-3">
              <Input
                label="Your name"
                value={profile.name}
                onChange={(e) => setField('name', e.target.value)}
              />
              <Input
                label="Business name"
                value={profile.businessName}
                onChange={(e) => setField('businessName', e.target.value)}
              />
              <Input
                label="Phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="0712 345 678"
                hint="Supported: 0712 345 678, 254712345678, or +254 712 345 678"
              />
              <Input
                label="Email"
                value={user?.email || ''}
                disabled
                hint="Contact support to change your email"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                  onClick={saveProfile}
                  loading={saving}
                >
                  Save profile
                </Button>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Change password
              </div>
            </div>
            <div className="space-y-3">
              <Input
                label="Current password"
                type="password"
                autoComplete="current-password"
                value={pwd.currentPassword}
                onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  hint="At least 8 characters"
                  value={pwd.newPassword}
                  onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  value={pwd.confirm}
                  onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  leftIcon={<KeyRound className="h-3.5 w-3.5" />}
                  onClick={savePassword}
                  loading={pwdSaving}
                >
                  Change password
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}