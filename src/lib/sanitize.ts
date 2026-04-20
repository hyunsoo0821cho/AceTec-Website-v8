const MAX_CHAT_LENGTH = 1000;
const MAX_CONTACT_MESSAGE_LENGTH = 5000;

export function sanitizeString(input: string, maxLength: number = MAX_CHAT_LENGTH): string {
  return input
    // 1) HTML entity 디코딩 (이중 인코딩 공격 방지)
    .replace(/&#0*60;/gi, '<').replace(/&#0*62;/gi, '>').replace(/&#x0*3c;/gi, '<').replace(/&#x0*3e;/gi, '>')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&')
    // 2) HTML 태그 제거
    .replace(/<[^>]*>/g, '')
    // 3) javascript:/data: URL 차단
    .replace(/javascript\s*:/gi, '').replace(/data\s*:/gi, '')
    // 4) 특수 문자 인코딩
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
