// Screenshot the built dashboard with headless Chrome over CDP (Node 24 built-in WebSocket).
// Usage: node scripts/shots.mjs <out-dir>   (out-dir holds dashboard/ + data.js)
// Writes screenshots/1-board.jpg, 2-detail.jpg, 3-filtered.jpg (1440x900, JPEG q80).
import { spawn, execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CHROME = process.env.CHROME_BIN || '/home/hatch/workspace/video-projects/lianxing-meixing/node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell';
const outDir = resolve(process.argv[2] ?? 'out');
const shotsDir = resolve('screenshots');
mkdirSync(shotsDir, { recursive: true });

const shots = [
  { name: '1-board.jpg', url: `file://${outDir}/dashboard/index.html`, scroll: null },
  { name: '2-detail.jpg', url: `file://${outDir}/dashboard/index.html#detail=steakhouse-financial`, scroll: '#detail' },
  { name: '3-filtered.jpg', url: `file://${outDir}/dashboard/index.html#cat=RWA`, scroll: null },
];

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--allow-file-access-from-files',
  '--remote-debugging-port=9222', '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(path, method = 'GET') {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:9222${path}`, { method });
      if (r.ok) return await r.json();
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error('CDP not reachable: ' + path);
}

let id = 0;
const pending = new Map();
function send(ws, method, params = {}) {
  return new Promise((resolvePromise, reject) => {
    const mid = ++id;
    pending.set(mid, { resolvePromise, reject });
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
}

try {
  const target = await getJson('/json/new?about:blank', 'PUT');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolvePromise, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolvePromise(msg.result);
    }
  };
  await send(ws, 'Page.enable');
  await send(ws, 'Runtime.enable');

  for (const shot of shots) {
    await send(ws, 'Page.navigate', { url: shot.url });
    await sleep(1200);
    // A navigation that only changes the #hash is a same-document navigation: the page's
    // script does not re-run. Force a reload so the hash state applies on load.
    await send(ws, 'Page.reload', { ignoreCache: true });
    await sleep(2500);
    const check = await send(ws, 'Runtime.evaluate', {
      expression: `JSON.stringify({rows: document.querySelectorAll('#rows tr').length, detail: !document.getElementById('detail').classList.contains('hidden'), count: document.getElementById('count').textContent, title: document.title, errors: window.__errs || 0})`,
      returnByValue: true,
    });
    console.log(shot.name, '->', check.result.value);
    if (shot.scroll) {
      await send(ws, 'Runtime.evaluate', { expression: `document.querySelector('${shot.scroll}').scrollIntoView({block:'start'})` });
      await sleep(400);
    } else {
      await send(ws, 'Runtime.evaluate', { expression: 'window.scrollTo(0,0)' });
      await sleep(200);
    }
    const pic = await send(ws, 'Page.captureScreenshot', { format: 'jpeg', quality: 80 });
    const buf = Buffer.from(pic.data, 'base64');
    writeFileSync(join(shotsDir, shot.name), buf);
    console.log('wrote', shot.name, buf.length, 'bytes');
  }
  ws.close();
} finally {
  try { execSync('curl -s http://127.0.0.1:9222/json/close 2>/dev/null | head -c 0'); } catch { /* ignore */ }
  chrome.kill('SIGKILL');
}
console.log('done');
