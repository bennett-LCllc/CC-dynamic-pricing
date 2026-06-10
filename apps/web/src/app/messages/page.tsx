'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/shared/Header';
import MessageThread from '@/components/messages/MessageThread';
import {
  getBookings,
  getProperties,
  getMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
} from '@/lib/api';
import type {
  Booking,
  PropertyListItem,
  MessageTemplate,
  CreateMessageTemplateInput,
  UpdateMessageTemplateInput,
  GuestMessage,
  MessageFilters as MessageFiltersInput,
} from '@cc-ops/shared';
import {
  Plus,
  Edit3,
  Trash2,
  MessageSquare,
  Search,
  Loader2,
  BookOpen,
  X,
  ChevronRight,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PlatformBadge } from '@/components/shared/PlatformBadge';

type ActiveTab = 'inbox' | 'templates';

// ─── Template Form Modal ─────────────────────────────────────────

function TemplateForm({
  template,
  onClose,
  onSaved,
}: {
  template?: MessageTemplate;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<CreateMessageTemplateInput>({
    trigger: template?.trigger ?? '',
    name: template?.name ?? '',
    subject: template?.subject ?? '',
    content: template?.content ?? '',
    channel: template?.channel ?? 'AIRBNB',
    isActive: template?.isActive ?? true,
    variables: template?.variables ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (template) {
        await updateMessageTemplate(template.id, form);
      } else {
        await createMessageTemplate(form);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold">
            {template ? 'Edit Template' : 'New Template'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                placeholder="e.g. Welcome Message"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trigger Event</label>
              <select
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none appearance-none bg-white"
                value={form.trigger}
                onChange={(e) => setForm({ ...form, trigger: e.target.value })}
              >
                <option value="">Custom</option>
                <option value="PRE_ARRIVAL">Pre-Arrival</option>
                <option value="CHECK_IN">Check-In Instructions</option>
                <option value="MID_STAY">Mid-Stay Check-In</option>
                <option value="CHECKOUT">Checkout Reminder</option>
                <option value="POST_STAY">Post-Stay Review</option>
                <option value="WELCOME">Welcome Message</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Subject (optional)</label>
            <input
              type="text"
              placeholder="Message subject"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              value={form.subject ?? ''}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Channel</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none appearance-none bg-white"
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value as any })}
            >
              <option value="AIRBNB">Airbnb</option>
              <option value="VRBO">VRBO</option>
              <option value="SMS">SMS</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea
              placeholder="Message content... Use {guestName}, {checkIn}, {checkOut}, {propertyName}, {propertyAddress} for variables"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none resize-none"
              rows={6}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : template ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inbox');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | undefined>();
  const [directionFilter, setDirectionFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [bksData, propsData, tplsData] = await Promise.all([
        getBookings().catch(() => [] as Booking[]),
        getProperties().catch(() => [] as PropertyListItem[]),
        getMessageTemplates().catch(() => [] as MessageTemplate[]),
      ]);
      setBookings(bksData);
      setProperties(propsData);
      setTemplates(tplsData);
      // Fetch messages for all bookings (will be filtered per booking in thread view)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteMessageTemplate(id);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleToggleTemplate = async (tpl: MessageTemplate) => {
    try {
      await updateMessageTemplate(tpl.id, { isActive: !tpl.isActive });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    }
  };

  // Build property map
  const propertyMap = new Map(properties.map((p) => [p.id, p.name]));

  // Build booking map
  const bookingMap = new Map(bookings.map((b) => [b.id, b]));

  // Filter bookings for inbox
  const filteredBookings = bookings.filter((b) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchGuest = b.guestName.toLowerCase().includes(q);
      const matchProperty = propertyMap.get(b.propertyId)?.toLowerCase().includes(q);
      if (!matchGuest && !matchProperty) return false;
    }
    return true;
  });

  return (
    <div>
      <Header title="Messages" subtitle="Guest communication hub" />
      <div className="p-8 space-y-6">
        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => { setActiveTab('inbox'); setSelectedBooking(null); }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'inbox'
                  ? 'bg-ocean-500 text-white'
                  : 'bg-white text-muted-foreground hover:bg-muted'
              }`}
            >
              Inbox
            </button>
            <button
              onClick={() => { setActiveTab('templates'); setSelectedBooking(null); }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'bg-ocean-500 text-white'
                  : 'bg-white text-muted-foreground hover:bg-muted'
              }`}
            >
              Templates ({templates.length})
            </button>
          </div>

          {activeTab === 'templates' && (
            <button
              onClick={() => { setEditingTemplate(undefined); setShowTemplateForm(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-ocean-500 text-white rounded-lg font-medium hover:bg-ocean-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          )}
        </div>

        {/* ============ INBOX TAB ============ */}
        {activeTab === 'inbox' && (
          <>
            {/* Thread view */}
            {selectedBooking ? (
              <div className="card overflow-hidden" style={{ height: 'calc(100vh - 260px)' }}>
                <MessageThread
                  booking={selectedBooking}
                  onBack={() => setSelectedBooking(null)}
                />
              </div>
            ) : (
              <>
                {/* Search */}
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search guests, properties..."
                    className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Booking list */}
                {loading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-8 h-8 text-ocean-500 animate-spin" />
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="card p-12 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchQuery ? 'No Matching Bookings' : 'No Bookings Yet'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {searchQuery
                        ? 'Try adjusting your search.'
                        : 'Create bookings to start managing guest messages.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredBookings.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-10 h-10 bg-ocean-50 rounded-full flex items-center justify-center">
                              <MessageSquare className="w-5 h-5 text-ocean-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm group-hover:text-ocean-600 transition-colors truncate">
                                  {b.guestName}
                                </span>
                                <PlatformBadge platform={b.platform} />
                                <StatusBadge status={b.status} />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {b.checkIn} → {b.checkOut}
                                {propertyMap.has(b.propertyId) && (
                                  <span className="ml-2">{propertyMap.get(b.propertyId)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-ocean-500 transition-colors shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ============ TEMPLATES TAB ============ */}
        {activeTab === 'templates' && (
          <>
            {templates.length === 0 ? (
              <div className="card p-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                  Create message templates for automated guest communication. Use variables like {'{guestName}'} and {'{checkIn}'} for personalization.
                </p>
                <button
                  onClick={() => { setEditingTemplate(undefined); setShowTemplateForm(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-ocean-500 text-white rounded-lg font-medium hover:bg-ocean-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create First Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{tpl.name}</h3>
                          {!tpl.isActive && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">{tpl.trigger || 'Custom'}</span>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                            {tpl.channel}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleTemplate(tpl)}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                          title={tpl.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <span className={tpl.isActive ? 'text-palm-600 text-xs font-medium' : 'text-muted-foreground text-xs font-medium'}>
                            {tpl.isActive ? 'ON' : 'OFF'}
                          </span>
                        </button>
                        <button
                          onClick={() => { setEditingTemplate(tpl); setShowTemplateForm(true); }}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500" />
                        </button>
                      </div>
                    </div>

                    {tpl.subject && (
                      <div className="text-xs text-muted-foreground mb-1">
                        Subject: {tpl.subject}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3 whitespace-pre-wrap">
                      {tpl.content}
                    </p>

                    {tpl.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tpl.variables.map((v) => (
                          <span key={v} className="text-xs bg-ocean-50 text-ocean-600 px-1.5 py-0.5 rounded">
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Template Form Modal */}
      {showTemplateForm && (
        <TemplateForm
          template={editingTemplate}
          onClose={() => setShowTemplateForm(false)}
          onSaved={() => {
            setShowTemplateForm(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
