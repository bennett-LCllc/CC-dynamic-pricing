/**
 * Messages service — Prisma business logic for guest messaging.
 */

import { prisma } from '@cc-ops/db';
import type {
  CreateMessageInput,
  CreateMessageTemplateInput,
  UpdateMessageInput,
  UpdateMessageTemplateInput,
  MessageFilters,
} from '@cc-ops/shared';

// ─── Message Templates ───────────────────────────────────────────

export async function getMessageTemplates() {
  return prisma.messageTemplate.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function getMessageTemplate(id: string) {
  return prisma.messageTemplate.findUnique({ where: { id } });
}

export async function createMessageTemplate(data: CreateMessageTemplateInput) {
  return prisma.messageTemplate.create({ data });
}

export async function updateMessageTemplate(
  id: string,
  data: UpdateMessageTemplateInput
) {
  return prisma.messageTemplate.update({ where: { id }, data });
}

export async function deleteMessageTemplate(id: string) {
  return prisma.messageTemplate.delete({ where: { id } });
}

// ─── Messages ───────────────────────────────────────────────────

export async function getMessages(filters?: MessageFilters) {
  const where: Record<string, unknown> = {};

  if (filters?.bookingId) {
    where.bookingId = filters.bookingId;
  }
  if (filters?.direction) {
    where.direction = filters.direction;
  }
  if (filters?.channel) {
    where.channel = filters.channel;
  }
  if (filters?.automated !== undefined) {
    where.automated = filters.automated;
  }

  return prisma.message.findMany({
    where,
    orderBy: { sentAt: 'desc' },
    include: {
      booking: {
        select: {
          id: true,
          guestName: true,
          property: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function getBookingMessages(bookingId: string) {
  return prisma.message.findMany({
    where: { bookingId },
    orderBy: { sentAt: 'asc' },
  });
}

export async function getMessage(id: string) {
  return prisma.message.findUnique({
    where: { id },
    include: {
      booking: {
        select: {
          id: true,
          guestName: true,
          guestEmail: true,
          property: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function sendMessage(data: CreateMessageInput) {
  return prisma.message.create({
    data: {
      bookingId: data.bookingId,
      direction: data.direction,
      channel: data.channel,
      content: data.content,
      templateId: data.templateId,
      automated: data.automated ?? false,
      sentAt: data.sentAt ? new Date(data.sentAt) : new Date(),
    },
    include: {
      booking: {
        select: {
          id: true,
          guestName: true,
          property: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function updateMessage(id: string, data: UpdateMessageInput) {
  return prisma.message.update({ where: { id }, data });
}

export async function markMessageDelivered(id: string) {
  return prisma.message.update({
    where: { id },
    data: { deliveredAt: new Date() },
  });
}

export async function markMessageRead(id: string) {
  return prisma.message.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function deleteMessage(id: string) {
  return prisma.message.delete({ where: { id } });
}
