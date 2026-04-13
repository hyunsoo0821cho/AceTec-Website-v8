// PII (개인식별정보) 마스킹 유틸리티
// Admin 목록 조회 등에서 기본적으로 PII를 가리고, 상세 조회 시에만 언마스킹하기 위한 순수 함수 모듈.

/** 이메일 마스킹: hyunsoo0821@acetec-korea.co.kr → hy******@ac************.co.kr */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '';
  const at = email.indexOf('@');
  if (at < 1) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const maskLocal = local.length <= 2 ? local[0] + '*' : local.slice(0, 2) + '*'.repeat(Math.max(2, local.length - 2));
  // 도메인은 마지막 TLD 보존, 앞쪽만 마스킹
  const dot = domain.lastIndexOf('.');
  if (dot < 1) return `${maskLocal}@${'*'.repeat(Math.max(3, domain.length))}`;
  const head = domain.slice(0, dot);
  const tld = domain.slice(dot); // .co.kr 등
  const maskHead = head.length <= 2 ? head[0] + '*' : head.slice(0, 2) + '*'.repeat(Math.max(2, head.length - 2));
  return `${maskLocal}@${maskHead}${tld}`;
}

/** 전화번호 마스킹: 01051128963 → 010****8963 (앞 3자리 + 마지막 4자리 유지) */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return '*'.repeat(digits.length);
  const head = digits.slice(0, 3);
  const tail = digits.slice(-4);
  return `${head}${'*'.repeat(digits.length - 7)}${tail}`;
}

/** admins 행에 대한 기본 마스킹 (목록 조회 응답용) */
export interface AdminRow {
  id: number;
  username: string;
  role: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export function maskAdminRow<T extends Partial<AdminRow>>(row: T): T {
  return {
    ...row,
    email: row.email ? maskEmail(row.email) : row.email,
    phone: row.phone ? maskPhone(row.phone) : row.phone,
  };
}
