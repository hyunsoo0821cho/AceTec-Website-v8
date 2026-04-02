import { a5 as defineMiddleware, ae as sequence } from './chunks/sequence_DNzh4xdL.mjs';
import '@astrojs/internal-helpers/path';
import 'piccolore';
import 'clsx';

const onRequest$1 = defineMiddleware(async (_context, next) => {
  const response = await next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:11434; font-src 'self'"
  );
  return response;
});

const onRequest = sequence(
	
	onRequest$1
	
);

export { onRequest };
