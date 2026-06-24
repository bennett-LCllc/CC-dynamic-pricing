/**
 * Auth service — Prisma-backed user authentication.
 */

import { prisma } from '@cc-ops/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}
const JWT_EXPIRES_IN = '1h';

export interface TokenPayload {
  userId: string;
  email: string | null;
  role: string;
  tokenVersion: number;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET!) as TokenPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<{ id: string; name: string | null; email: string | null; role: string; tokenVersion: number } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role, tokenVersion: user.tokenVersion };
}

export async function createUser(data: {
  name?: string;
  email: string;
  password: string;
  role?: string;
}): Promise<{ id: string; name: string | null; email: string | null; role: string }> {
  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: (data.role as 'ADMIN' | 'MANAGER' | 'VIEWER') || 'ADMIN',
    },
  });
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
  });
}

export async function updateUser(
  id: string,
  data: { name?: string; email?: string; role?: string; password?: string },
) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password);
    updateData.tokenVersion = { increment: 1 };
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
  });
}

export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}

export async function listUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  });
}
