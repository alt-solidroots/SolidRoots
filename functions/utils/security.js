// Central secure HTTP headers for production deployment
export const CSP_POLICY =
  "default-src 'self'; script-src 'self' https:; style-src 'self' 'unsafe-inline' https:; img-src * data:; connect-src 'self' https:; font-src 'self' https:; object-src 'none'; frame-ancestors 'none'";

export function secureHeaders() {
  return {
    'Content-Security-Policy': CSP_POLICY,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}
