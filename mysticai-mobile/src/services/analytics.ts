import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { envConfig } from '../config/env';

export type AnalyticsPrimitive = string | number | boolean | null | undefined;
export type AnalyticsParams = Record<string, AnalyticsPrimitive>;

type QueuedEvent = {
  name: string;
  params: Record<string, string | number | boolean | null>;
  timestampMs: number;
};

const DEVICE_ID_KEY = 'analytics:device_id';
const SESSION_ID_KEY = 'analytics:session_id';
const MAX_QUEUE_SIZE = 80;
const EVENT_NAME_PATTERN = /^[a-z0-9_]+$/;

const analyticsConfig = envConfig.analytics;
const isEnabled = analyticsConfig.enabled;
const isAmplitude = analyticsConfig.provider === 'amplitude';
const debugMode = analyticsConfig.debug;

let initialized = false;
let initPromise: Promise<void> | null = null;
let flushInFlight = false;
let deviceId = `mystic-device-${Date.now().toString(36)}-${Math.round(Math.random() * 1_000_000).toString(36)}`;
let sessionId = Date.now();
const queue: QueuedEvent[] = [];

function randomId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.round(Math.random() * 1_000_000_000).toString(36)}`;
}

function sanitizeParams(params?: AnalyticsParams): Record<string, string | number | boolean | null> {
  const normalized: Record<string, string | number | boolean | null> = {};
  if (!params) {
    return normalized;
  }

  for (const [key, value] of Object.entries(params)) {
    if (!key) {
      continue;
    }
    if (value === undefined) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      normalized[key] = value;
      continue;
    }
    normalized[key] = String(value);
  }

  return normalized;
}

function debugLog(message: string, payload?: unknown) {
  if (!debugMode) {
    return;
  }
  if (payload === undefined) {
    console.info(`[analytics] ${message}`);
    return;
  }
  console.info(`[analytics] ${message}`, payload);
}

function validateEventName(name: string): boolean {
  if (!name || !EVENT_NAME_PATTERN.test(name)) {
    debugLog(`Invalid event name. Use snake_case: "${name}"`);
    return false;
  }
  return true;
}

async function ensureInitialized(): Promise<void> {
  if (initialized) {
    return;
  }
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    try {
      const [storedDeviceId, storedSessionId] = await Promise.all([
        AsyncStorage.getItem(DEVICE_ID_KEY),
        AsyncStorage.getItem(SESSION_ID_KEY),
      ]);

      if (storedDeviceId?.trim()) {
        deviceId = storedDeviceId.trim();
      } else {
        const next = randomId('mystic-device');
        deviceId = next;
        await AsyncStorage.setItem(DEVICE_ID_KEY, next);
      }

      const parsedSession = Number.parseInt(storedSessionId ?? '', 10);
      if (Number.isFinite(parsedSession) && parsedSession > 0) {
        sessionId = parsedSession;
      } else {
        sessionId = Date.now();
        await AsyncStorage.setItem(SESSION_ID_KEY, String(sessionId));
      }
    } catch (error) {
      debugLog('Initialization failed, using in-memory identifiers.', error);
    } finally {
      initialized = true;
    }
  })();

  await initPromise;
}

function enqueue(event: QueuedEvent) {
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.shift();
  }
  queue.push(event);
}

async function flushQueue(): Promise<void> {
  if (!isEnabled || !isAmplitude || flushInFlight || queue.length === 0) {
    return;
  }

  const apiKey = analyticsConfig.apiKey;
  if (!apiKey) {
    return;
  }

  flushInFlight = true;
  const batched = queue.splice(0, queue.length);

  const payload = {
    api_key: apiKey,
    events: batched.map((event) => ({
      event_type: event.name,
      event_properties: event.params,
      time: event.timestampMs,
      session_id: sessionId,
      device_id: deviceId,
      platform: Platform.OS,
      os_name: Platform.OS,
      app_version: '1.0.0',
    })),
  };

  try {
    const response = await fetch(analyticsConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    debugLog(`Flushed ${batched.length} event(s)`, batched.map((event) => event.name));
  } catch (error) {
    debugLog('Flush failed, keeping events in queue.', error);
    for (const event of batched) {
      enqueue(event);
    }
  } finally {
    flushInFlight = false;
  }
}

export function trackEvent(name: string, params?: AnalyticsParams): void {
  if (!validateEventName(name)) {
    return;
  }

  const normalizedParams = sanitizeParams(params);
  const event = {
    name,
    params: normalizedParams,
    timestampMs: Date.now(),
  };

  debugLog(`${name}`, normalizedParams);

  if (!isEnabled) {
    return;
  }

  void (async () => {
    await ensureInitialized();
    enqueue(event);
    await flushQueue();
  })();
}

