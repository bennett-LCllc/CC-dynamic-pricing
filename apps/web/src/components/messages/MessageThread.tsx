'use client';

import { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  Loader2,
  Bot,
  Mail,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  getBookingMessages,
  sendMessage,
  deleteMessage,
  getMessageTemplates,
} from '@/lib/api';
import type {
  Booking,
  GuestMessage,
  CreateMessageInput,
  MessageTemplate,
  PropertySummary,
} from '@cc-ops/shared';

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  AIRBNB: MessageSquare,
  VRBO: MessageSquare,
  SMS: Smartphone,
  EMAIL: Mail,
};

const TRIGGER_OPTIONS = [
  { label: 'Custom', value: '' },
  { label: 'Pre-Arrival', value: 'PRE_ARRIVAL' },
  { label: 'Check-In Instructions', value: 'CHECK_IN' },
  { label: 'Mid-Stay Check-In', value: 'MID_STAY' },
  { label: 'Checkout Reminder', value: 'CHECKOUT' },
  { label: 'Post-Stay Review', value: 'POST_STAY' },
  { label: 'Welcome Message', value: 'WELCOME' },
];

interface MessageThreadProps {
  booking: Booking;
  onBack: () => void;
}

export default function MessageThread({
  booking,
  onBack,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Compose form
  const [channel, setChannel] = useState<string>('AIRBNB');
  const [content, setContent] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const msgs = await getBookingMessages(booking.id);
      setMessages(msgs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const t = await getMessageTemplates();
      setTemplates(t);
    } catch {
      // Templates are optional
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchTemplates();
  }, [booking.id]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    setError('');
    try {
      const input: CreateMessageInput = {
        bookingId: booking.id,
        direction: 'OUTBOUND',
        channel: channel as CreateMessageInput['channel'],
        content: content.trim(),
        sentAt: new Date().toISOString(),
      };
      await sendMessage(input);
      setContent('');
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this message?')) return;
    try {
      await deleteMessage(id);
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const applyTemplate = (tpl: MessageTemplate) => {
    if (!tpl) return;
    let text = tpl.content;
    // Simple variable replacement
    text = text.replace(/\{guestName\}/g, booking.guestName || 'Guest');
    text = text.replace(/\{checkIn\}/g, booking.checkIn || '');
    text = text.replace(/\{checkOut\}/g, booking.checkOut || '');
    const prop = (booking.property || (booking as any).property) as PropertySummary | undefined | null;
    if (prop) {
      text = text.replace(/\{propertyName\}/g, prop.name || '');
      text = text.replace(/\{propertyAddress\}/g, prop.address || '');
    }
    setContent(text);
    setShowTemplates(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h2 className="font-semibold text-lg">{booking.guestName}</h2>
              <div className="text-sm text-muted-foreground">
                {booking.checkIn} → {booking.checkOut}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            <Bot className="w-4 h-4" />
            Templates
          </button>
        </div>
      </div>

      {/* Template panel */}
      {showTemplates && (
        <div className="bg-muted/50 border-b border-border px-6 py-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Apply Template
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                No templates yet. Create some in the Templates tab.
              </span>
            ) : (
              templates
                .filter((t) => t.isActive)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="px-3 py-1.5 text-sm bg-white border border-border rounded-lg hover:bg-ocean-50 hover:border-ocean-300 transition-colors"
                  >
                    {t.name}
                  </button>
                ))
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-ocean-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No messages yet for this booking. Send the first one.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOut = msg.direction === 'OUTBOUND';
            const ChannelIcon = CHANNEL_ICONS[msg.channel] || MessageSquare;
            return (
              <div
                key={msg.id}
                className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-3 ${
                    isOut
                      ? 'bg-ocean-500 text-white'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ChannelIcon className="w-3.5 h-3.5 opacity-70" />
                    <span className="text-xs font-medium opacity-70">
                      {msg.channel}
                    </span>
                    {msg.automated && (
                      <span className="flex items-center gap-0.5 text-xs opacity-70">
                        <Bot className="w-3 h-3" />
                        auto
                      </span>
                    )}
                    <span className="text-xs opacity-50 ml-auto">
                      {new Date(msg.sentAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 py-2 text-sm text-red-600 bg-red-50 border-t border-red-100">
          {error}
        </div>
      )}

      {/* Compose */}
      <div className="bg-white border-t border-border p-4">
        <div className="flex items-end gap-3">
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none appearance-none bg-white"
          >
            <option value="AIRBNB">Airbnb</option>
            <option value="VRBO">VRBO</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
          </select>
          <div className="flex-1 relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={2}
              className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none resize-none"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!content.trim() || sending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-ocean-500 text-white rounded-lg text-sm font-medium hover:bg-ocean-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[42px]"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
