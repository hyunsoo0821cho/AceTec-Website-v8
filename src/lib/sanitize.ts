const MAX_CHAT_LENGTH = 1000;
const MAX_CONTACT_MESSAGE_LENGTH = 5000;

export function sanitizeString(input: string, maxLength: number = MAX_CHAT_LENGTH): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeChatMessage(input: string): string {
  return sanitizeString(input, MAX_CHAT_LENGTH);
}

export function sanitizeContactMessage(input: string): string {
  return sanitizeString(input, MAX_CONTACT_MESSAGE_LENGTH);
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
