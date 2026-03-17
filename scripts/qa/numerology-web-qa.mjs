#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import process from 'node:process';
import WebSocket from 'ws';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs/reports/artifacts/numerology-qa');
const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9333;
const USER_DATA_DIR = '/tmp/mystic-numerology-qa-chrome-profile';

const TARGET_URL = 'http://localhost:8090/numerology';
const PUSH_URL = 'http://localhost:8090/numerology?entry_point=push_numerology_checkin';

const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844, mobile: true, url: TARGET_URL },
  { name: '430x932', width: 430, height: 932, mobile: true, url: TARGET_URL },
  { name: '768x1024', width: 768, height: 1024, mobile: true, url: TARGET_URL },
  { name: '1280x800', width: 1280, height: 800, mobile: false, url: TARGET_URL },
  { name: 'push-entry-430x932', width: 430, height: 932, mobile: true, url: PUSH_URL },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, data) {
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function fetchJson(url, timeoutMs = 10_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP_${res.status} ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function waitForDevToolsPageSocket() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const pages = await fetchJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`, 1500);
      const page = Array.isArray(pages)
        ? pages.find((item) => item?.type === 'page' && item?.webSocketDebuggerUrl)
        : null;
      if (page?.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(250);
  }
  throw new Error('CDP endpoint hazir degil');
}

function startChrome() {
  try {
    fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
  } catch {}

  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    'about:blank',
  ];

  const child = spawn(CHROME_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  return child;
}

function createCdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  const listeners = new Map();
  let seq = 0;

  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result ?? {});
      return;
    }

    const callbacks = listeners.get(msg.method) ?? [];
    callbacks.forEach((cb) => cb(msg.params ?? {}));
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  function on(method, cb) {
    const list = listeners.get(method) ?? [];
    list.push(cb);
    listeners.set(method, list);
  }

  async function close() {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  }

  return {
    ws,
    send,
    on,
    close,
  };
}

async function waitOpen(ws, timeoutMs = 10_000) {
  if (ws.readyState === WebSocket.OPEN) return;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('CDP websocket acilamadi')), timeoutMs);
    ws.once('open', () => {
      clearTimeout(timer);
      resolve();
    });
    ws.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function buildAuthStateScript() {
  const authState = {
    state: {
      token: 'qa-dev-token',
      refreshToken: 'qa-dev-refresh-token',
      isAuthenticated: true,
      isHydrated: true,
      pendingEmail: null,
      lastResendAt: null,
      user: {
        id: 999001,
        username: 'qa-guest',
        name: 'Kalite Test',
        firstName: 'Kalite',
        lastName: 'Test',
        birthDate: '1995-05-05',
        preferredLanguage: 'tr',
        userType: 'GUEST',
        isAnonymous: true,
      },
    },
    version: 0,
  };

  return `
    (function () {
      localStorage.setItem('auth_token', 'qa-dev-token');
      localStorage.setItem('refresh_token', 'qa-dev-refresh-token');
      localStorage.setItem('auth-store', ${JSON.stringify(JSON.stringify(authState))});
      return {
        pathname: location.pathname,
        keys: Object.keys(localStorage).slice(0, 20)
      };
    })();
  `;
}

async function navigate(cdp, url) {
  const loaded = new Promise((resolve) => {
    const handler = () => resolve();
    cdp.on('Page.loadEventFired', handler);
  });
  await cdp.send('Page.navigate', { url });
  await Promise.race([loaded, sleep(20_000)]);
  await sleep(1200);
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result?.value;
}

async function dismissTutorialIfAny(cdp) {
  await evaluate(
    cdp,
    `
      (function () {
        const candidates = Array.from(document.querySelectorAll('button,[role="button"],div,span'));
        const target = candidates.find((el) => {
          const txt = (el.textContent || '').trim().toLowerCase();
          return txt === 'skip' || txt === 'geç' || txt === 'ileri' || txt === 'sonra';
        });
        if (target) {
          target.click();
          return (target.textContent || '').trim();
        }
        return null;
      })();
    `,
  );
}

async function captureViewport(cdp, viewport, outPath) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
    screenWidth: viewport.width,
    screenHeight: viewport.height,
  });
  await navigate(cdp, viewport.url);
  await dismissTutorialIfAny(cdp);
  await sleep(500);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  const state = await evaluate(cdp, `({ path: location.pathname + location.search, title: document.title, text: (document.body && document.body.innerText || '').slice(0, 220) })`);
  return state;
}

async function main() {
  ensureDir(OUT_DIR);
  const reportPath = path.join(OUT_DIR, 'web-qa-report.json');

  const chrome = startChrome();
  let cdp;
  const startedAt = new Date().toISOString();
  const report = {
    startedAt,
    targetUrl: TARGET_URL,
    pushUrl: PUSH_URL,
    results: [],
    authSeed: null,
    error: null,
  };

  try {
    const wsUrl = await waitForDevToolsPageSocket();
    cdp = createCdpClient(wsUrl);
    await waitOpen(cdp.ws);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    await navigate(cdp, 'http://localhost:8090/');
    const authSeed = await evaluate(cdp, buildAuthStateScript());
    report.authSeed = authSeed;

    for (const viewport of VIEWPORTS) {
      const filename = `numerology-${viewport.name}.png`;
      const outPath = path.join(OUT_DIR, filename);
      const pageState = await captureViewport(cdp, viewport, outPath);
      report.results.push({
        viewport: viewport.name,
        width: viewport.width,
        height: viewport.height,
        url: viewport.url,
        output: outPath,
        pageState,
      });
    }
  } catch (error) {
    report.error = String(error?.stack || error?.message || error);
  } finally {
    report.finishedAt = new Date().toISOString();
    writeJson(reportPath, report);
    if (cdp) {
      await cdp.close().catch(() => {});
    }
    chrome.kill('SIGTERM');
  }

  if (report.error) {
    console.error(report.error);
    process.exit(1);
  }

  console.log(`QA raporu: ${reportPath}`);
  for (const item of report.results) {
    console.log(`${item.viewport}: ${item.pageState?.path ?? 'unknown'} -> ${item.output}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
