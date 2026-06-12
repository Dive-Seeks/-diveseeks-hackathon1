export class AccountHealth {
  passwordAgeDays: number;
  isTwoFactorEnabled: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  failedLoginCount: number;
  unusualActivityFlags: string[];
}
