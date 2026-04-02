const store = /* @__PURE__ */ new Map();
function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  },
  5 * 60 * 1e3
);

const MAX_CHAT_LENGTH = 1e3;
const MAX_CONTACT_MESSAGE_LENGTH = 5e3;
function sanitizeString(input, maxLength = MAX_CHAT_LENGTH) {
  return input.replace(/<[^>]*>/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").trim().slice(0, maxLength);
}
function sanitizeChatMessage(input) {
  return sanitizeString(input, MAX_CHAT_LENGTH);
}
function sanitizeContactMessage(input) {
  return sanitizeString(input, MAX_CONTACT_MESSAGE_LENGTH);
}
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export { EMAIL_REGEX as E, sanitizeContactMessage as a, checkRateLimit as c, sanitizeChatMessage as s };
