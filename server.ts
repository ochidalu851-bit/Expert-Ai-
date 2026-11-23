import apiModule, { cleanExpiredFiles } from './backend/railway/index.ts';

const apiFetch = apiModule.fetch;

// Keep hourly temporary-upload cleanup enabled on Railway.
const runHourlyCleanup = () => cleanExpiredFiles().catch(error => console.error('Expert AI hourly file cleanup failed:', String(error)));
void runHourlyCleanup();
setInterval(runHourlyCleanup, 60 * 60 * 1000);
const port = Number(Bun.env.PORT || 3000);

async function serveStatic(request: Request, apiResponse: Response): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return apiResponse;

  let pathname = '/';
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return new Response('Bad Request', { status: 400 }); }
  if (pathname.split('/').some(part => part === '..')) return new Response('Bad Request', { status: 400 });

  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = Bun.file('dist/' + relative);
  if (await file.exists()) {
    return new Response(file, {
      headers: { 'cache-control': relative === 'index.html' ? 'no-cache' : 'public, max-age=3600' },
    });
  }

  if (request.headers.get('accept')?.includes('text/html')) {
    const index = Bun.file('dist/index.html');
    if (await index.exists()) return new Response(index, { headers: { 'cache-control': 'no-cache' } });
  }
  return apiResponse;
}

Bun.serve({
  port,
  hostname: '0.0.0.0',
  async fetch(request: Request) {
    const response = await apiFetch(request);
    return serveStatic(request, response);
  },
});

console.log('Expert AI web and API server listening on port ' + port);
