import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workbench = path.join(repo, 'workbench');
const output = path.join(repo, '.static-workbench');
const excluded = new Set([
  'server.mjs',
  'state',
  'exports',
  'assets/local',
  'local-asset-manifest.mjs',
  'start-workbench.cmd',
]);

const normalize = value => value.split(path.sep).join('/');
const publishable = source => {
  const relative = normalize(path.relative(workbench, source));
  return !relative || ![...excluded].some(item => relative === item || relative.startsWith(`${item}/`));
};
const copyWorkbench = () => fs.cpSync(workbench, output, { recursive: true, filter: publishable });
const privateKeys = new Set(['local_image_path', 'source_url', 'external_locator', 'source_ref']);
const redact = value => {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !privateKeys.has(key))
    .map(([key, nested]) => [key, redact(nested)]));
  return typeof value === 'string'
    ? value.replace(/source_url\s*=\s*https?:\/\/[^\s;]+;?\s*/gi, '').replace(/https?:\/\/[^\s;]+/g, '[source omitted]')
    : value;
};
const sanitizeData = data => redact({
  ...data,
  // Reference source locations may be private. The shared UI only needs the
  // stable key, themes, evidence state and excerpted semantic text.
  references: (data.references || []).map(({ reference_key, reference_type, themes, snippets, evidence_status }) => ({
    reference_key, reference_type, themes, snippets, evidence_status,
  })),
});
const startServer = () => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['workbench/server.mjs'], {
    cwd: repo,
    env: { ...process.env, WORKBENCH_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const timer = setTimeout(() => { child.kill(); reject(new Error('Timed out while preparing the static catalogue snapshot.')); }, 15_000);
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  child.on('error', error => { clearTimeout(timer); reject(error); });
  child.stdout.on('data', chunk => {
    const text = chunk.toString();
    const match = text.match(/http:\/\/127\.0\.0\.1:(\d+)/);
    if (!match) return;
    clearTimeout(timer);
    resolve({ child, url: `http://127.0.0.1:${match[1]}`, stderr });
  });
});

const { child, url } = await startServer();
try {
  const response = await fetch(`${url}/api/data`);
  if (!response.ok) throw new Error(`Catalogue endpoint returned ${response.status}.`);
  const data = sanitizeData(await response.json());
  fs.rmSync(output, { recursive: true, force: true });
  copyWorkbench();
  // The desktop build uses origin-rooted paths. GitHub Pages is served from a
  // repository subpath, so only the copied public runtime receives relative URLs.
  const generatedRuntime = path.join(output, 'generated-bead-assets.mjs');
  fs.writeFileSync(generatedRuntime, fs.readFileSync(generatedRuntime, 'utf8').replace('`/assets/catalog/generated/', '`./assets/catalog/generated/'));
  const canvasRuntime = path.join(output, 'bracelet-canvas.mjs');
  fs.writeFileSync(canvasRuntime, fs.readFileSync(canvasRuntime, 'utf8').replace("from '/vendor/fabric/index.min.mjs'", "from './vendor/fabric/index.min.mjs'"));
  fs.mkdirSync(path.join(output, 'data'), { recursive: true });
  fs.mkdirSync(path.join(output, 'vendor', 'fabric'), { recursive: true });
  fs.copyFileSync(path.join(repo, 'node_modules', 'fabric', 'dist', 'index.min.mjs'), path.join(output, 'vendor', 'fabric', 'index.min.mjs'));
  fs.writeFileSync(path.join(output, 'data', 'static-data.json'), JSON.stringify({
    published_at: new Date().toISOString(),
    publication_mode: 'shared_static_snapshot',
    data,
  }, null, 2));
  const index = fs.readFileSync(path.join(output, 'index.html'), 'utf8')
    .replace('<head>', '<head>\n  <base href="./">')
    .replace('<script type="module" src="app.js?build=graphite-v1"></script>', '<script src="shared-bootstrap.js"></script>\n  <script type="module" src="app.js?build=shared-static-v1"></script>');
  fs.writeFileSync(path.join(output, 'index.html'), index);
  console.log(`Shared Workbench static site prepared at ${output}`);
} finally {
  child.kill();
}
