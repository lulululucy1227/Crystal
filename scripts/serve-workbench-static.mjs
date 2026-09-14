import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(repo, '.static-workbench');
const port = Number(process.env.SHARED_WORKBENCH_PORT || 4174);
const types = { '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const file = path.resolve(root, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile() || path.relative(root, file).startsWith('..')) {
    response.writeHead(404); return response.end('Not found');
  }
  response.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  response.end(fs.readFileSync(file));
}).listen(port, '127.0.0.1', () => console.log(`Shared Workbench QA http://127.0.0.1:${port}`));
