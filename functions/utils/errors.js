// Centralized error response helpers with production-safe output
import { secureHeaders } from './security.js';

function isProduction(env) {
  const v = ((env && (env.NODE_ENV || env.APP_ENV || env.ENV)) || 'development').toString().toLowerCase();
  return v === 'production';
}

export function errorResponse(err, status = 500, env) {
  const prod = isProduction(env);
  const headers = Object.assign({ 'Content-Type': 'application/json' }, secureHeaders());
  if (prod) {
    // Do not leak internal error details in production
    console.error('[ERR] (prod):', err && err.stack ? err.stack : 'Internal error');
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status,
      headers
    });
  }
  // Development: show error details to aid debugging
  console.error('[ERR]:', err && err.stack ? err.stack : err);
  const message = err && err.message ? err.message : String(err);
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers
  });
}
