'use client';

import { useEffect, useState } from 'react';
import {
  getSettings,
  saveSettings,
  deleteSetting,
  getUsers,
  updateUser as updateUserApi,
  deleteUserApi,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { SettingsMap, User, UserRole } from '@cc-ops/shared';
import {
  Settings, Key, Bell, Building2, Users, Plus, Trash2, Save,
  Loader2, AlertTriangle, Eye, EyeOff, Shield, X,
} from 'lucide-react';

type Tab = 'api-keys' | 'notifications' | 'llc' | 'users';

const PREDEFINED_KEYS = [
  { key: 'AIRBNB_API_KEY', label: 'Airbnb API Key', category: 'api-keys' },
  { key: 'VRBO_API_KEY', label: 'VRBO API Key', category: 'api-keys' },
  { key: 'STRIPE_SECRET_KEY', label: 'Stripe Secret Key', category: 'api-keys' },
  { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe Webhook Secret', category: 'api-keys' },
  { key: 'SMTP_HOST', label: 'SMTP Host', category: 'notifications' },
  { key: 'SMTP_PORT', label: 'SMTP Port', category: 'notifications' },
  { key: 'SMTP_USER', label: 'SMTP Username', category: 'notifications' },
  { key: 'SMTP_PASSWORD', label: 'SMTP Password', category: 'notifications' },
  { key: 'NOTIFICATION_EMAIL', label: 'Notification Email', category: 'notifications' },
  { key: 'SLACK_WEBHOOK_URL', label: 'Slack Webhook URL', category: 'notifications' },
  { key: 'LLC_STR_NAME', label: 'STR LLC Name', category: 'llc' },
  { key: 'LLC_LAWN_NAME', label: 'Lawn LLC Name', category: 'llc' },
  { key: 'LLC_CLEANING_NAME', label: 'Cleaning LLC Name', category: 'llc' },
  { key: 'LLC_EIN', label: 'EIN (Tax ID)', category: 'llc' },
  { key: 'LLC_ADDRESS', label: 'Business Address', category: 'llc' },
];

const TABS: { id: Tab; label: string; icon: typeof Settings }[] = [
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'llc', label: 'LLC Config', icon: Building2 },
  { id: 'users', label: 'Users', icon: Users },
];

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  VIEWER: 'bg-gray-100 text-gray-700',
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('api-keys');
  const [settings, setSettings] = useState<SettingsMap>({});
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('VIEWER');

  const isAdmin = user?.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [settingsData, usersData] = await Promise.all([
        getSettings(),
        getUsers().catch(() => []),
      ]);
      setSettings(settingsData);
      setUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSaveValue = async (key: string, value: string) => {
    setSaving(true);
    setError('');
    try {
      const updated = await saveSettings([{ key, value }]);
      setSettings((prev) => ({ ...prev, ...updated }));
      showSuccess(`Saved ${key}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (key: string) => {
    if (!confirm(`Delete "${key}"?`)) return;
    setSaving(true);
    try {
      await deleteSetting(key);
      setSettings((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      showSuccess(`Deleted ${key}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomKey = async () => {
    if (!newKey.trim() || !newVal.trim()) return;
    setSaving(true);
    try {
      const updated = await saveSettings([{ key: newKey.trim(), value: newVal }]);
      setSettings((prev) => ({ ...prev, ...updated }));
      setNewKey('');
      setNewVal('');
      setShowAddKey(false);
      showSuccess(`Added ${newKey}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add key');
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = (key: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleUpdateUserRole = async (userId: string, role: UserRole) => {
    try {
      await updateUserApi(userId, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      setEditingUser(null);
      showSuccess('User role updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      await deleteUserApi(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showSuccess('User deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const currentKeys = PREDEFINED_KEYS.filter((k) => k.category === activeTab);
  const customKeys = Object.keys(settings).filter(
    (k) => !PREDEFINED_KEYS.some((pk) => pk.key === k),
  );

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Platform configuration, API keys, and user management
            </p>
          </div>
        </div>
      </div>

      <div className="p-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
            <Shield className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}

        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-48 shrink-0">
            <nav className="space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-ocean-50 text-ocean-700'
                        : 'text-muted-foreground hover:bg-gray-50 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-ocean-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* API Keys Tab */}
                {activeTab === 'api-keys' && (
                  <>
                    <div className="card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">Platform API Keys</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Manage integrations with Airbnb, VRBO, Stripe, and more
                          </p>
                        </div>
                        <button
                          onClick={() => setShowAddKey(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Key
                        </button>
                      </div>

                      {showAddKey && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-border">
                          <div className="flex gap-3">
                            <input
                              type="text"
                              placeholder="Key name (e.g. CUSTOM_API_KEY)"
                              value={newKey}
                              onChange={(e) => setNewKey(e.target.value)}
                              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                            />
                            <input
                              type="text"
                              placeholder="Value"
                              value={newVal}
                              onChange={(e) => setNewVal(e.target.value)}
                              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                            />
                            <button
                              onClick={handleAddCustomKey}
                              disabled={saving}
                              className="px-4 py-2 bg-ocean-600 text-white rounded-lg text-sm font-medium hover:bg-ocean-700 disabled:opacity-50"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => { setShowAddKey(false); setNewKey(''); setNewVal(''); }}
                              className="px-3 py-2 border border-border rounded-lg text-sm hover:bg-gray-50"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        {currentKeys.map((k) => (
                          <ApiKeyRow
                            key={k.key}
                            label={k.label}
                            value={settings[k.key] || ''}
                            visible={visibleKeys.has(k.key)}
                            saving={saving}
                            onToggleVisibility={() => toggleVisibility(k.key)}
                            onSave={(val) => handleSaveValue(k.key, val)}
                            onDelete={() => handleDeleteKey(k.key)}
                          />
                        ))}
                        {customKeys.map((k) => (
                          <ApiKeyRow
                            key={k}
                            label={k}
                            value={settings[k] || ''}
                            visible={visibleKeys.has(k)}
                            saving={saving}
                            onToggleVisibility={() => toggleVisibility(k)}
                            onSave={(val) => handleSaveValue(k, val)}
                            onDelete={() => handleDeleteKey(k)}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="card p-6">
                    <h3 className="font-semibold mb-1">Notification Settings</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Configure email, SMTP, and webhook notifications
                    </p>
                    <div className="space-y-3">
                      {currentKeys.map((k) => (
                        <SettingRow
                          key={k.key}
                          label={k.label}
                          value={settings[k.key] || ''}
                          saving={saving}
                          onSave={(val) => handleSaveValue(k.key, val)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* LLC Config Tab */}
                {activeTab === 'llc' && (
                  <div className="card p-6">
                    <h3 className="font-semibold mb-1">LLC Configuration</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Business entity details for STR, Lawn, and Cleaning LLCs
                    </p>
                    <div className="space-y-3">
                      {currentKeys.map((k) => (
                        <SettingRow
                          key={k.key}
                          label={k.label}
                          value={settings[k.key] || ''}
                          saving={saving}
                          onSave={(val) => handleSaveValue(k.key, val)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">User Management</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Manage team access and roles
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">User</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Email</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Role</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Created</th>
                            {isAdmin && <th className="text-right py-2 px-3 font-medium text-muted-foreground">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id} className="border-b border-border last:border-0">
                              <td className="py-3 px-3 font-medium">{u.name || '—'}</td>
                              <td className="py-3 px-3 text-muted-foreground">{u.email || '—'}</td>
                              <td className="py-3 px-3">
                                {editingUser === u.id ? (
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={editRole}
                                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                                      className="px-2 py-1 border border-border rounded text-xs"
                                    >
                                      <option value="ADMIN">Admin</option>
                                      <option value="MANAGER">Manager</option>
                                      <option value="VIEWER">Viewer</option>
                                    </select>
                                    <button
                                      onClick={() => handleUpdateUserRole(u.id, editRole)}
                                      className="text-xs text-ocean-600 hover:text-ocean-800 font-medium"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingUser(null)}
                                      className="text-xs text-muted-foreground hover:text-gray-700"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                                    {u.role}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-muted-foreground text-xs">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </td>
                              {isAdmin && (
                                <td className="py-3 px-3 text-right">
                                  {u.id !== user?.id && editingUser !== u.id && (
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => { setEditingUser(u.id); setEditRole(u.role); }}
                                        className="text-xs text-ocean-600 hover:text-ocean-800 font-medium"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(u.id)}
                                        className="text-xs text-red-500 hover:text-red-700"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function ApiKeyRow({
  label,
  value,
  visible,
  saving,
  onToggleVisibility,
  onSave,
  onDelete,
}: {
  label: string;
  value: string;
  visible: boolean;
  saving: boolean;
  onToggleVisibility: () => void;
  onSave: (val: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const masked = value && !visible ? '•'.repeat(Math.min(value.length, 24)) : value;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-border">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
        {editing ? (
          <div className="flex gap-2">
            <input
              type={visible ? 'text' : 'password'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 px-2 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-ocean-600 text-white rounded text-xs font-medium hover:bg-ocean-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={() => { setEditing(false); setDraft(value); }}
              className="px-2 py-1.5 border border-border rounded text-xs hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-gray-700 truncate">
              {masked || <span className="text-muted-foreground italic">Not set</span>}
            </code>
            {value && (
              <button onClick={onToggleVisibility} className="text-muted-foreground hover:text-gray-700 shrink-0">
                {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        )}
      </div>
      {!editing && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="px-2.5 py-1.5 text-xs font-medium text-ocean-600 hover:bg-ocean-50 rounded transition-colors"
          >
            {value ? 'Edit' : 'Set'}
          </button>
          {value && (
            <button
              onClick={onDelete}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SettingRow({
  label,
  value,
  saving,
  onSave,
}: {
  label: string;
  value: string;
  saving: boolean;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-border">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
        {editing ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="flex-1 px-2 py-1.5 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              autoFocus
            />
            <button
              onClick={() => { onSave(draft); setEditing(false); }}
              disabled={saving}
              className="px-3 py-1.5 bg-ocean-600 text-white rounded text-xs font-medium hover:bg-ocean-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => { setEditing(false); setDraft(value); }}
              className="px-2 py-1.5 border border-border rounded text-xs hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-700">
            {value || <span className="text-muted-foreground italic">Not set</span>}
          </div>
        )}
      </div>
      {!editing && (
        <button
          onClick={() => setEditing(true)}
          className="px-2.5 py-1.5 text-xs font-medium text-ocean-600 hover:bg-ocean-50 rounded transition-colors shrink-0"
        >
          {value ? 'Edit' : 'Set'}
        </button>
      )}
    </div>
  );
}
