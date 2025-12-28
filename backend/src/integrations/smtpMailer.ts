import nodemailer from 'nodemailer';
import { DriverInviteEmail, IdReminderEmail, Mailer, PasswordResetEmail } from './mailer';

type SmtpConfig = {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  secure: boolean;
  from: string;
  appBaseUrl?: string;
};

export class SmtpMailer implements Mailer {
  private transport: nodemailer.Transporter;
  private from: string;
  private appBaseUrl?: string;

  constructor(config: SmtpConfig) {
    this.transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined
    });
    this.from = config.from;
    this.appBaseUrl = config.appBaseUrl;
  }

  async sendPasswordReset(payload: PasswordResetEmail): Promise<void> {
    const resetUrl = this.appBaseUrl
      ? `${this.appBaseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(payload.resetToken)}`
      : `token:${payload.resetToken}`;
    await this.transport.sendMail({
      from: this.from,
      to: payload.to,
      subject: 'パスワード再発行のご案内',
      text: `パスワード再設定リンク: ${resetUrl}\n有効期限: ${payload.expiresAt.toISOString()}`
    });
  }

  async sendIdReminder(payload: IdReminderEmail): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to: payload.to,
      subject: 'ログインIDのご案内',
      text: `ログインIDはこのメールアドレスです: ${payload.to}`
    });
  }

  async sendDriverInvite(payload: DriverInviteEmail): Promise<void> {
    const inviteUrl = this.appBaseUrl
      ? `${this.appBaseUrl.replace(/\/$/, '')}/driver-invite?token=${encodeURIComponent(payload.inviteToken)}`
      : `token:${payload.inviteToken}`;
    await this.transport.sendMail({
      from: this.from,
      to: payload.to,
      subject: 'ドライバー招待のご案内',
      text: `アカウント作成リンク: ${inviteUrl}\n有効期限: ${payload.expiresAt.toISOString()}`
    });
  }
}

export const createMailerFromEnv = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';
  const from = process.env.SMTP_FROM;
  const appBaseUrl = process.env.APP_BASE_URL;

  if (!host || !from) return null;
  return new SmtpMailer({ host, port, user, pass, secure, from, appBaseUrl });
};
