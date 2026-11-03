import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const port = Number(process.env.PORT || 4173);
const root = resolve(process.env.DEPLOY_ROOT || resolve(import.meta.dirname, '..', 'dist'));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end('Method Not Allowed');
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Bad Request');
    return;
  }

  if (pathname === '/health') {
    const healthy = existsSync(resolve(root, 'index.html'));
    response.writeHead(healthy ? 200 : 503, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    response.end(JSON.stringify({ status: healthy ? 'ok' : 'unavailable', service: 'focusboard', time: new Date().toISOString() }));
    return;
  }

  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = resolve(root, relative);
  if ((!file.startsWith(root + sep) && file !== root) || relative.split('/').some(segment => segment.startsWith('.'))) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const details = await stat(file);
    if (!details.isFile()) throw new Error('Not a file');
    response.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end('Not Found');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`FocusBoard running at http://127.0.0.1:${port} (root: ${root})`));
