import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// .env 파일 수동 로드 (Astro SSR에서 process.env 보장)
try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim();
      }
    }
  }
} catch { /* 무시 */ }

// SMTP 설정
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!SMTP_USER || !SMTP_PASS) return null; // SMTP 미설정
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6자리
}

export async function sendVerificationEmail(to: string, code: string, purpose: 'register' | 'reset'): Promise<boolean> {
  const t = getTransporter();

  const subject = purpose === 'register'
    ? '[AceTec] 회원가입 인증 코드'
    : '[AceTec] 비밀번호 재설정 인증 코드';

  const html = `
    <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h2 style="color:#0f172a;">${purpose === 'register' ? '회원가입 인증' : '비밀번호 재설정'}</h2>
      <p style="color:#475569;">아래 인증 코드를 입력해주세요. 코드는 10분간 유효합니다.</p>
      <div style="background:#f1f5f9;padding:20px;text-align:center;border-radius:8px;margin:24px 0;">
        <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0f172a;">${code}</span>
      </div>
      <p style="color:#94a3b8;font-size:13px;">본인이 요청하지 않았다면 이 메일을 무시하세요.</p>
    </div>
  `;

  if (!t) {
    // SMTP 미설정 시 콘솔에 코드 출력 (개발용)
    console.log(`[EMAIL] To: ${to} | Code: ${code} | Purpose: ${purpose}`);
    return true;
  }

  try {
    await t.sendMail({ from: SMTP_FROM, to, subject, html });
    console.log(`[EMAIL] Sent successfully to: ${to}`);
    return true;
  } catch (err) {
    console.error('[EMAIL] Send failed:', err);
    console.log(`[EMAIL FALLBACK] To: ${to} | Code: ${code}`);
    return false;
  }
}
