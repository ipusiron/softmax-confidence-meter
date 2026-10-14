import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const edgeCandidates = [
  process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  '/usr/bin/microsoft-edge',
  '/usr/bin/microsoft-edge-stable'
].filter(Boolean);
const edgePath = edgeCandidates.find(existsSync);

if (!edgePath) {
  throw new Error('Microsoft Edge was not found. Set up Edge before running this optional browser check.');
}

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png']
]);

function startStaticServer() {
  const server = createServer((request, response) => {
    const requested = new URL(request.url, 'http://127.0.0.1').pathname;
    const relative = requested === '/' ? 'index.html' : decodeURIComponent(requested.slice(1));
    const target = path.resolve(root, relative);
    if (!target.startsWith(`${root}${path.sep}`) && target !== path.join(root, 'index.html')) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    try {
      response.writeHead(200, {
        'Content-Type': mimeTypes.get(path.extname(target)) || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      response.end(readFileSync(target));
    } catch (_error) {
      response.writeHead(404).end('Not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function availablePort() {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForDebugTarget(port) {
  const endpoint = `http://127.0.0.1:${port}/json/list`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const targets = await fetch(endpoint).then(response => response.json());
      const page = targets.find(target => target.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch (_error) {
      // Edge is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out while waiting for the Edge debugging target.');
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.errors = [];
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      if (message.method === 'Runtime.exceptionThrown') {
        this.errors.push(message.params.exceptionDetails.text);
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        this.errors.push('console.error');
      }
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
        this.errors.push(message.params.entry.text);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
    return response.result.value;
  }

  close() {
    this.socket.close();
  }
}

async function waitFor(client, expression, label) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (await client.evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

async function navigate(client, url) {
  await client.send('Page.navigate', { url });
  await waitFor(client, 'document.readyState === "complete" && Boolean(window.SoftmaxCore)', url);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function setViewport(client, width, height = 900) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false
  });
}

async function capture(client, relativePath) {
  const { data } = await client.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  });
  writeFileSync(path.join(root, relativePath), Buffer.from(data, 'base64'));
}

const staticServer = await startStaticServer();
const profile = await mkdtemp(path.join(tmpdir(), 'softmax-meter-edge-'));
const debugPort = await availablePort();
const browser = spawn(edgePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--remote-allow-origins=*',
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  'about:blank'
], { stdio: 'ignore' });

let client;
try {
  const websocketUrl = await waitForDebugTarget(debugPort);
  client = new CdpClient(websocketUrl);
  await client.connect();
  await Promise.all([
    client.send('Page.enable'),
    client.send('Runtime.enable'),
    client.send('Log.enable')
  ]);

  const { port } = staticServer.address();
  await setViewport(client, 1100, 820);
  await navigate(client, `http://127.0.0.1:${port}/`);
  assert(await client.evaluate('document.documentElement.lang === "ja"'), 'Japanese must be the initial language.');
  await client.evaluate('document.querySelector("[data-tab=meter]").click(); document.querySelector("[data-sample=basic]").click();');
  assert(await client.evaluate('!document.getElementById("result-content").hidden'), 'The sample must produce a result.');
  assert(await client.evaluate('document.getElementById("top-candidates").children.length === 3'), 'The sample must display three candidates.');
  await capture(client, 'assets/screenshot.png');

  for (const width of [320, 390, 600, 1280]) {
    await setViewport(client, width, 920);
    const layout = await client.evaluate(`(() => {
      const title = document.querySelector('h1').getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        centerDelta: Math.abs((title.left + title.width / 2) - document.documentElement.clientWidth / 2)
      };
    })()`);
    assert(!layout.overflow, `Horizontal overflow at ${width}px.`);
    assert(layout.centerDelta <= 2, `The title is not centered at ${width}px.`);
  }

  await setViewport(client, 1100, 820);
  await client.evaluate('document.getElementById("language-toggle").click();');
  assert(await client.evaluate('document.documentElement.lang === "en"'), 'The language button must switch to English.');
  assert(await client.evaluate('document.getElementById("result-heading").textContent === "Analysis result"'), 'Dynamic result labels must switch to English.');
  await capture(client, 'assets/screenshot-en.png');

  await client.evaluate(`(() => {
    const input = document.getElementById('candidate-input');
    input.value = '<img src=x onerror=globalThis.__xss=1>: 1\\nSafe: 0';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('calculate-button').click();
  })()`);
  assert(await client.evaluate('globalThis.__xss === undefined'), 'Candidate text must not execute.');
  assert(await client.evaluate('document.querySelectorAll("#result-content img").length === 0'), 'Candidate text must not create HTML.');

  await setViewport(client, 390, 800);
  await navigate(client, pathToFileURL(path.join(root, 'index.html')).href);
  assert(await client.evaluate('Boolean(window.SoftmaxCore && window.SoftmaxI18n)'), 'Classic scripts must load through file://.');
  await client.evaluate('document.querySelector("[data-tab=meter]").click(); document.querySelector("[data-sample=close]").click();');
  assert(await client.evaluate('!document.getElementById("result-content").hidden'), 'file:// sample calculation must work.');
  assert(await client.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'), 'file:// mobile view must not overflow.');

  assert(client.errors.length === 0, `Browser errors: ${client.errors.join(' | ')}`);
  process.stdout.write('Browser checks passed: HTTP + file://, JA/EN, 320/390/600/1280px, XSS-safe rendering, screenshots.\n');
} finally {
  if (client) client.close();
  browser.kill();
  if (browser.exitCode === null) {
    await Promise.race([
      once(browser, 'exit'),
      new Promise(resolve => setTimeout(resolve, 3000))
    ]);
  }
  await new Promise(resolve => staticServer.close(resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
