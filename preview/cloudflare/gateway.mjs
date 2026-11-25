import {createRemoteJWKSet, jwtVerify} from 'jose';

const issuer = 'https://red-brook-6c8d.cloudflareaccess.com';
const keys = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer));

async function authorized(request, env) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || !env.ACCESS_AUD) return false;
  try {
    const {payload} = await jwtVerify(token, keys, {
      issuer, audience: env.ACCESS_AUD, algorithms: ['RS256'], requiredClaims: ['exp','email']
    });
    return typeof payload.email === 'string' && payload.email.length > 0;
  } catch {
    return false;
  }
}

export default { async fetch(request, env) {
  if (!(await authorized(request, env))) return new Response('Access denied', {status: 403, headers: {'Cache-Control':'no-store'}});
  const url = new URL(request.url);
  if (url.pathname === '/') return Response.redirect(new URL('/dashboard',url),302);
  if (/^\/dashboard(?:\/|$)/.test(url.pathname)) url.pathname='/admin.html';
  else if (!url.pathname.split('/').pop().includes('.') || url.pathname.endsWith('.html')) return new Response('Not found',{status:404});
  return env.ASSETS.fetch(new Request(url,request));
}};
