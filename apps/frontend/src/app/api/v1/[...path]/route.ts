import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const url = `${process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:4000'}/api/v1/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;
    const headers = new Headers();
    for (const name of ['authorization', 'content-type', 'x-api-key', 'x-request-id']) { const value = request.headers.get(name); if (value) headers.set(name, value); }
    const response = await fetch(url, { method: request.method, headers, body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(), signal: AbortSignal.timeout(30000), redirect: 'manual', cache: 'no-store' });
    const outgoing = new Headers();
    for (const name of ['content-type', 'content-disposition', 'x-request-id', 'location']) { const value = response.headers.get(name); if (value) outgoing.set(name, value); }
    outgoing.set('Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch {
    return Response.json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'The API is temporarily unavailable. Please retry.' } }, { status: 503 });
  }
}
export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS };
