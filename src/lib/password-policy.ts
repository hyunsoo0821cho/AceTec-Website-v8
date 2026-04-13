import { z } from 'zod';

// 비밀번호 복잡성 정책
// - 최소 8자
// - 영문 대/소문자 최소 1개
// - 숫자 최소 1개
// - 특수문자 최소 1개
export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 8자 이상이어야 합니다')
  .max(128, '비밀번호는 128자 이하여야 합니다')
  .refine((v) => /[A-Za-z]/.test(v), '영문자를 포함해야 합니다')
  .refine((v) => /[0-9]/.test(v), '숫자를 포함해야 합니다')
  .refine((v) => /[^A-Za-z0-9]/.test(v), '특수문자를 포함해야 합니다');

export function validatePassword(pw: unknown): { ok: true } | { ok: false; error: string } {
  const result = passwordSchema.safeParse(pw);
  if (result.success) return { ok: true };
  return { ok: false, error: result.error.issues[0]?.message ?? '비밀번호가 정책에 맞지 않습니다' };
}
