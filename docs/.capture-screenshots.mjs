import { writeFile } from 'node:fs/promises';

const tabs = await fetch('http://127.0.0.1:9222/json').then((response) => response.json());
const tab = tabs.find(({ type }) => type === 'page');
const socket = new WebSocket(tab.webSocketDebuggerUrl);
const pending = new Map();
const methodById = new Map();
let commandId = 0;

socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(`${methodById.get(message.id)}: ${message.error.message}`));
    else resolve(message.result);
  }
});

await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));

function command(method, params = {}) {
  const id = ++commandId;
  methodById.set(id, method);
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  return result.result.value;
}

function execute(expression) {
  return command('Runtime.evaluate', { expression, awaitPromise: true });
}

async function waitFor(expression) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function navigate(url) {
  await command('Page.navigate', { url });
  await waitFor("document.readyState === 'complete'");
}

async function screenshot(path) {
  const { data } = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(path, Buffer.from(data, 'base64'));
}

await command('Page.enable');
await command('Runtime.enable');
await command('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});

await navigate('http://localhost:5173/login');
await waitFor("Boolean(document.querySelector('input[type=email]'))");
await execute(`(() => {
  const set = (selector, value) => {
    const input = document.querySelector(selector);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  set('input[type=email]', 'dwhitfield@riverbendu.edu');
  set('input[type=password]', 'RiverbendHoops1!');
  document.querySelector('button[type=submit]').click();
})()`);
await waitFor("location.pathname === '/' && document.body.innerText.includes('Prospects')");

await navigate('http://localhost:5173/board');
await waitFor("document.body.innerText.includes('Keeping Tabs') && document.body.innerText.includes('Evaluating')");
await screenshot('docs/screenshots/board.png');

await navigate('http://localhost:5173/my-team');
await waitFor("document.body.innerText.includes('Jalen Whitmore') && document.body.innerText.includes('My Team')");
await screenshot('docs/screenshots/roster.png');

socket.close();
