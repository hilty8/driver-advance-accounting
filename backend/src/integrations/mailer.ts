export type PasswordResetEmail = {
  to: string;
  resetToken: string;
  expiresAt: Date;
};

export type IdReminderEmail = {
  to: string;
};

export type DriverInviteEmail = {
  to: string;
  inviteToken: string;
  expiresAt: Date;
};

export interface Mailer {
  sendPasswordReset(payload: PasswordResetEmail): Promise<void>;
  sendIdReminder(payload: IdReminderEmail): Promise<void>;
  sendDriverInvite(payload: DriverInviteEmail): Promise<void>;
}

export class NoopMailer implements Mailer {
  async sendPasswordReset(_payload: PasswordResetEmail): Promise<void> {
    return;
  }

  async sendIdReminder(_payload: IdReminderEmail): Promise<void> {
    return;
  }

  async sendDriverInvite(_payload: DriverInviteEmail): Promise<void> {
    return;
  }
}
