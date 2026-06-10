/**
 * Settings service — key-value configuration store.
 */

import { prisma } from '@cc-ops/db';

export async function getSettings() {
  const rows = await prisma.settings.findMany();
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.settings.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function upsertSetting(key: string, value: string) {
  return prisma.settings.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function upsertSettings(
  entries: Array<{ key: string; value: string }>,
) {
  const results: Record<string, string> = {};
  for (const entry of entries) {
    await upsertSetting(entry.key, entry.value);
    results[entry.key] = entry.value;
  }
  return results;
}

export async function deleteSetting(key: string): Promise<void> {
  await prisma.settings.delete({ where: { key } });
}
