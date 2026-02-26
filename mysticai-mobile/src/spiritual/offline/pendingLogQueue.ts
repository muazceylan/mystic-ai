import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import type { PendingSpiritualLogJob, PendingSpiritualLogKind } from '../types';
import { protectQueuePayload, unprotectQueuePayload } from '../storage/secureStorage';

const QUEUE_KEY = 'mystic:spiritual:pending-log-queue';

function nowIso() {
  return new Date().toISOString();
}

function makeId(kind: PendingSpiritualLogKind) {
  const rnd =
    (globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  return `${kind}:${rnd}`;
}

async function readQueue(): Promise<PendingSpiritualLogJob[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const unprotected = await unprotectQueuePayload(raw);
    const parsed = JSON.parse(unprotected);
    return Array.isArray(parsed) ? parsed as PendingSpiritualLogJob[] : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: PendingSpiritualLogJob[]): Promise<void> {
  const serialized = JSON.stringify(queue);
  const protectedPayload = await protectQueuePayload(serialized);
  await AsyncStorage.setItem(QUEUE_KEY, protectedPayload);
}

export async function getPendingSpiritualLogQueue(): Promise<PendingSpiritualLogJob[]> {
  return readQueue();
}

export async function enqueuePendingSpiritualLog(input: {
  kind: PendingSpiritualLogKind;
  endpoint: string;
  payload: Record<string, unknown>;
}): Promise<PendingSpiritualLogJob> {
  const queue = await readQueue();
  const job: PendingSpiritualLogJob = {
    id: makeId(input.kind),
    kind: input.kind,
    endpoint: input.endpoint,
    payload: input.payload,
    createdAt: nowIso(),
    retries: 0,
  };
  queue.push(job);
  await writeQueue(queue);
  return job;
}

export async function flushPendingSpiritualLogQueue(): Promise<{ sent: number; remaining: number }> {
  const queue = await readQueue();
  if (queue.length === 0) {
    return { sent: 0, remaining: 0 };
  }

  let sent = 0;
  const remaining: PendingSpiritualLogJob[] = [];

  for (const job of queue) {
    try {
      await api.post(job.endpoint, job.payload);
      sent += 1;
    } catch (error: any) {
      const status = error?.response?.status;

      // 4xx -> payload invalid/unauthorized olabilir; kuyruktan dusur (sonsuz retry olmasin)
      if (typeof status === 'number' && status >= 400 && status < 500) {
        continue;
      }

      remaining.push({
        ...job,
        retries: (job.retries ?? 0) + 1,
        lastError: error?.message ?? 'Unknown error',
      });
    }
  }

  await writeQueue(remaining);
  return { sent, remaining: remaining.length };
}

