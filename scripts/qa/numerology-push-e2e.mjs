#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = resolve(process.cwd());
const ARTIFACT_DIR = resolve(ROOT, 'docs/reports/artifacts/numerology-qa');
const REPORT_PATH = resolve(ARTIFACT_DIR, 'push-e2e-report.json');
const SCREENSHOT_PATH = resolve(ARTIFACT_DIR, 'numerology-push-live-430x932.png');

const API_BASE = process.env.NOTIFICATION_API_BASE ?? 'http://localhost:8088';
const WEB_BASE = process.env.NUMEROLOGY_WEB_BASE ?? 'http://localhost:8090';
const USER_ID = process.env.NOTIFICATION_TEST_USER_ID ?? '63';
const GATEWAY_KEY =
  process.env.INTERNAL_GATEWAY_KEY ?? 'local-dev-internal-gateway-key-change-me';
const CHROME_BIN =
  process.env.CHROME_BIN ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function triggerNumerologyPush() {
  const url = `${API_BASE}/api/v1/notifications/test-type/NUMEROLOGY_CHECKIN`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Internal-Gateway-Key': GATEWAY_KEY,
      'X-User-Id': USER_ID,
    },
  });

  const raw = await response.text();
  let body = null;
  try {
    body = JSON.parse(raw);
  } catch (_err) {
    body = { raw };
  }

  return {
    status: response.status,
    ok: response.ok,
    body,
  };
}

function runChromeScreenshot(targetUrl) {
  return new Promise((resolvePromise, rejectPromise) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--window-size=430,932',
      '--virtual-time-budget=8000',
      `--screenshot=${SCREENSHOT_PATH}`,
      targetUrl,
    ];

    const child = spawn(CHROME_BIN, args, {
      stdio: 'pipe',
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      rejectPromise(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        rejectPromise(
          new Error(
            `Chrome exited with code ${code}. stdout=${stdout} stderr=${stderr}`,
          ),
        );
        return;
      }
      resolvePromise({ code, stdout, stderr });
    });
  });
}

function normalizeDeeplink(deeplink) {
  if (!deeplink || typeof deeplink !== 'string') {
    return '/numerology?entry_point=push_numerology_checkin';
  }
  if (deeplink.startsWith('http://') || deeplink.startsWith('https://')) {
    return deeplink;
  }
  if (deeplink.startsWith('/')) {
    return `${WEB_BASE}${deeplink}`;
  }
  return `${WEB_BASE}/${deeplink}`;
}

async function main() {
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  mkdirSync(dirname(SCREENSHOT_PATH), { recursive: true });

  const startedAt = new Date().toISOString();
  const triggerResult = await triggerNumerologyPush();
  const deeplink =
    triggerResult?.body?.deeplink ?? '/numerology?entry_point=push_numerology_checkin';
  const targetUrl = normalizeDeeplink(deeplink);

  let screenshotResult = null;
  let screenshotError = null;
  try {
    screenshotResult = await runChromeScreenshot(targetUrl);
  } catch (error) {
    screenshotError = String(error?.message ?? error);
  }

  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    apiBase: API_BASE,
    webBase: WEB_BASE,
    userId: USER_ID,
    triggerResult,
    targetUrl,
    screenshot: {
      path: SCREENSHOT_PATH,
      ok: screenshotError == null,
      error: screenshotError,
      stdout: screenshotResult?.stdout ?? '',
      stderr: screenshotResult?.stderr ?? '',
    },
    assertions: {
      triggerStatus200: triggerResult.status === 200,
      pushSentTrue: triggerResult?.body?.pushSent === true,
      deeplinkHasEntryPoint:
        typeof triggerResult?.body?.deeplink === 'string' &&
        triggerResult.body.deeplink.includes('entry_point=push_numerology_checkin'),
      screenshotCaptured: screenshotError == null,
    },
  };

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

  const failed = Object.entries(report.assertions)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);

  if (failed.length > 0) {
    console.error(`Push E2E failed: ${failed.join(', ')}`);
    console.error(`Report: ${REPORT_PATH}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Push E2E passed.`);
  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Screenshot: ${SCREENSHOT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
