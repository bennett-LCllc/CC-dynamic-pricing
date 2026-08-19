/**
 * Messages routes — Express router for /api/messages
 */

import { Request, Response, Router } from 'express';
import { z } from 'zod';
import {
  createMessageTemplate,
  deleteMessage,
  deleteMessageTemplate,
  getBookingMessages,
  getMessage,
  getMessages,
  getMessageTemplates,
  markMessageDelivered,
  markMessageRead,
  sendMessage,
  updateMessage,
  updateMessageTemplate,
} from '../services/messages';

const router = Router();

// ============================================================
// Validation schemas
// ============================================================

const templateSchema = z.object({
  trigger: z.string().min(1, 'Trigger event is required').max(100),
  name: z.string().min(1, 'Template name is required').max(200),
  subject: z.string().max(500).optional(),
  content: z.string().min(1, 'Content is required'),
  channel: z.enum(['AIRBNB', 'VRBO', 'SMS', 'EMAIL']).optional(),
  isActive: z.boolean().optional(),
  variables: z.array(z.string()).optional(),
});

const messageSchema = z.object({
  bookingId: z.string().min(1, 'Booking is required'),
  direction: z.enum(['INBOUND', 'OUTBOUND']),
  channel: z.enum(['AIRBNB', 'VRBO', 'SMS', 'EMAIL']).optional(),
  content: z.string().min(1, 'Content is required').max(10000),
  templateId: z.string().optional(),
  automated: z.boolean().optional(),
  sentAt: z.string().optional(),
});

// ============================================================
// GET /api/messages/templates — List templates
// ============================================================

router.get('/templates', async (_req: Request, res: Response) => {
  try {
    const templates = await getMessageTemplates();
    res.json({ data: templates });
  } catch (err) {
    console.error('GET /api/messages/templates error:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// ============================================================
// POST /api/messages/templates — Create template
// ============================================================

router.post('/templates', async (req: Request, res: Response) => {
  const result = templateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const template = await createMessageTemplate(result.data);
    res.status(201).json({ data: template });
  } catch (err) {
    console.error('POST /api/messages/templates error:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// ============================================================
// PUT /api/messages/templates/:id — Update template
// ============================================================

router.put('/templates/:id', async (req: Request, res: Response) => {
  const result = templateSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const template = await updateMessageTemplate(req.params.id, result.data);
    res.json({ data: template });
  } catch (err: any) {
    console.error(`PUT /api/messages/templates/${req.params.id} error:`, err);
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// ============================================================
// DELETE /api/messages/templates/:id — Delete template
// ============================================================

router.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    await deleteMessageTemplate(req.params.id);
    res.json({ message: 'Template deleted' });
  } catch (err: any) {
    console.error(`DELETE /api/messages/templates/${req.params.id} error:`, err);
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ============================================================
// GET /api/messages — List messages
// ============================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const messages = await getMessages({
      bookingId: req.query.bookingId as string | undefined,
      direction: req.query.direction as string | undefined,
      channel: req.query.channel as string | undefined,
      automated: req.query.automated !== undefined ? req.query.automated === 'true' : undefined,
    });
    res.json({ data: messages });
  } catch (err) {
    console.error('GET /api/messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ============================================================
// GET /api/messages/booking/:bookingId — Messages for a booking
// ============================================================

router.get('/booking/:bookingId', async (req: Request, res: Response) => {
  try {
    const messages = await getBookingMessages(req.params.bookingId);
    res.json({ data: messages });
  } catch (err) {
    console.error(`GET /api/messages/booking/${req.params.bookingId} error:`, err);
    res.status(500).json({ error: 'Failed to fetch booking messages' });
  }
});

// ============================================================
// GET /api/messages/:id — Get single message
// ============================================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const message = await getMessage(req.params.id);
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    res.json({ data: message });
  } catch (err) {
    console.error(`GET /api/messages/${req.params.id} error:`, err);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

// ============================================================
// POST /api/messages — Send message
// ============================================================

router.post('/', async (req: Request, res: Response) => {
  const result = messageSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const message = await sendMessage(result.data);
    res.status(201).json({ data: message });
  } catch (err: any) {
    console.error('POST /api/messages error:', err);
    if (err.code === 'P2003') {
      res.status(400).json({ error: 'Invalid booking ID' });
      return;
    }
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ============================================================
// PUT /api/messages/:id — Update message
// ============================================================

router.put('/:id', async (req: Request, res: Response) => {
  const result = messageSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const message = await updateMessage(req.params.id, result.data);
    res.json({ data: message });
  } catch (err: any) {
    console.error(`PUT /api/messages/${req.params.id} error:`, err);
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// ============================================================
// POST /api/messages/:id/delivered — Mark delivered
// ============================================================

router.post('/:id/delivered', async (req: Request, res: Response) => {
  try {
    const message = await markMessageDelivered(req.params.id);
    res.json({ data: message });
  } catch (err: any) {
    console.error(`POST /api/messages/${req.params.id}/delivered error:`, err);
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to mark delivered' });
  }
});

// ============================================================
// POST /api/messages/:id/read — Mark read
// ============================================================

router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const message = await markMessageRead(req.params.id);
    res.json({ data: message });
  } catch (err: any) {
    console.error(`POST /api/messages/${req.params.id}/read error:`, err);
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

// ============================================================
// DELETE /api/messages/:id — Delete message
// ============================================================

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteMessage(req.params.id);
    res.json({ message: 'Message deleted' });
  } catch (err: any) {
    console.error(`DELETE /api/messages/${req.params.id} error:`, err);
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
