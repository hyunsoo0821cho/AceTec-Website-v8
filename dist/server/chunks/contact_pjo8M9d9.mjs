import { z } from 'zod';
import { s as supabase } from './supabase_D3svsCwH.mjs';
import { c as checkRateLimit, a as sanitizeContactMessage, E as EMAIL_REGEX } from './sanitize_DnlzqER4.mjs';

const ContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().regex(EMAIL_REGEX),
  message: z.string().min(1).max(5e3),
  newsletter: z.boolean().optional().default(false),
  sourcePage: z.string().optional()
});
const POST = async ({ request }) => {
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  const { allowed } = checkRateLimit(`contact:${ip}`, 5, 6e4);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Too many submissions. Please wait." }), {
      status: 429,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const parsed = ContactSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid form data", details: parsed.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const data = {
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      email: parsed.data.email,
      message: sanitizeContactMessage(parsed.data.message),
      newsletter_opt_in: parsed.data.newsletter,
      source_page: parsed.data.sourcePage,
      ip_address: ip
    };
    if (supabase) ;
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Contact API error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
