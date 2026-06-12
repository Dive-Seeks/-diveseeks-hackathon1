"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

type AccountResponse = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isVerified: boolean;
  };
  preferences: {
    id: string;
    userId: string;
    theme: "light" | "dark" | "system";
    timezone: string;
    language: string;
  };
};

type AccountHealthResponse = {
  passwordAgeDays: number;
  isTwoFactorEnabled: boolean;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  failedLoginCount: number;
  unusualActivityFlags: string[];
};

type ApiResponseShape<T> = {
  data?: {
    data?: T;
  };
};

export function unwrapApiPayload<T>(response: ApiResponseShape<T>) {
  const payload = response.data?.data as unknown;
  if (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    "data" in payload
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export function getPasswordStrength(password: string) {
  const checks = {
    minLength: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return {
    checks,
    score,
    isStrong: score === 5,
  };
}

export default function AccountPage() {
  const updateUser = useAuthStore((state) => state.updateUser);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = React.useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = React.useState(false);
  const [isLoadingHealth, setIsLoadingHealth] = React.useState(true);
  const [profile, setProfile] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [preferences, setPreferences] = React.useState({
    theme: "system" as "light" | "dark" | "system",
    timezone: "UTC",
    language: "en",
  });
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [accountHealth, setAccountHealth] =
    React.useState<AccountHealthResponse | null>(null);

  const loadAccount = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/account/me");
      const data = unwrapApiPayload<AccountResponse>(response.data);
      setProfile({
        firstName: data.user.firstName || "",
        lastName: data.user.lastName || "",
        email: data.user.email || "",
      });
      setPreferences({
        theme: data.preferences.theme || "system",
        timezone: data.preferences.timezone || "UTC",
        language: data.preferences.language || "en",
      });
    } catch {
      toast.error("Failed to load account details");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadHealth = React.useCallback(async () => {
    setIsLoadingHealth(true);
    try {
      const response = await api.get("/account/health");
      const data = unwrapApiPayload<AccountHealthResponse>(response.data);
      setAccountHealth(data);
    } catch {
      toast.error("Failed to load account health");
    } finally {
      setIsLoadingHealth(false);
    }
  }, []);

  React.useEffect(() => {
    void loadAccount();
    void loadHealth();
  }, [loadAccount, loadHealth]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      void loadHealth();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadHealth]);

  const saveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const response = await api.patch("/account/me", {
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
      const user = unwrapApiPayload<{
        firstName: string;
        lastName: string;
      }>(response.data);
      updateUser({
        firstName: user.firstName,
        lastName: user.lastName,
      });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePreferences = async () => {
    setIsSavingPreferences(true);
    try {
      await api.patch("/account/preferences", preferences);
      toast.success("Preferences updated");
    } catch {
      toast.error("Failed to update preferences");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const updatePassword = async () => {
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      toast.error("All password fields are required");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }
    const strength = getPasswordStrength(passwordForm.newPassword);
    if (!strength.isStrong) {
      toast.error(
        "Use a stronger password with 12+ chars, upper/lowercase, number, and symbol",
      );
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await api.patch("/account/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Password updated successfully");
      void loadHealth();
    } catch (error) {
      if (typeof error === "object" && error !== null && "response" in error) {
        const message = (
          error as { response?: { data?: { message?: string } } }
        ).response?.data?.message;
        toast.error(message || "Failed to update password");
        return;
      }
      toast.error("Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const passwordStrength = React.useMemo(
    () => getPasswordStrength(passwordForm.newPassword),
    [passwordForm.newPassword],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, password security, and account health
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your account name details</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="account-email">Email</FieldLabel>
              <Input id="account-email" value={profile.email} disabled />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-first-name">First name</FieldLabel>
              <Input
                id="account-first-name"
                value={profile.firstName}
                onChange={(event) =>
                  setProfile((prev) => ({
                    ...prev,
                    firstName: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-last-name">Last name</FieldLabel>
              <Input
                id="account-last-name"
                value={profile.lastName}
                onChange={(event) =>
                  setProfile((prev) => ({
                    ...prev,
                    lastName: event.target.value,
                  }))
                }
              />
            </Field>
          </FieldGroup>
          <Button onClick={saveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? "Saving..." : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Control dashboard experience defaults
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="account-theme">Theme</FieldLabel>
              <Input
                id="account-theme"
                value={preferences.theme}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    theme:
                      (event.target.value as "light" | "dark" | "system") ||
                      "system",
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-timezone">Timezone</FieldLabel>
              <Input
                id="account-timezone"
                value={preferences.timezone}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    timezone: event.target.value,
                  }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="account-language">Language</FieldLabel>
              <Input
                id="account-language"
                value={preferences.language}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    language: event.target.value,
                  }))
                }
              />
            </Field>
          </FieldGroup>
          <Button onClick={savePreferences} disabled={isSavingPreferences}>
            {isSavingPreferences ? "Saving..." : "Save preferences"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password Security</CardTitle>
          <CardDescription>
            Verify your current password and set a stronger replacement
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="account-current-password">
                Current password
              </FieldLabel>
              <Input
                id="account-current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    currentPassword: event.target.value,
                  }))
                }
              />
            </Field>
            <Field
              data-invalid={
                passwordForm.newPassword.length > 0 &&
                !passwordStrength.isStrong
              }
            >
              <FieldLabel htmlFor="account-new-password">
                New password
              </FieldLabel>
              <Input
                id="account-new-password"
                type="password"
                aria-invalid={
                  passwordForm.newPassword.length > 0 &&
                  !passwordStrength.isStrong
                }
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    newPassword: event.target.value,
                  }))
                }
              />
            </Field>
            <Field
              data-invalid={
                passwordForm.confirmPassword.length > 0 &&
                passwordForm.confirmPassword !== passwordForm.newPassword
              }
            >
              <FieldLabel htmlFor="account-confirm-password">
                Confirm new password
              </FieldLabel>
              <Input
                id="account-confirm-password"
                type="password"
                aria-invalid={
                  passwordForm.confirmPassword.length > 0 &&
                  passwordForm.confirmPassword !== passwordForm.newPassword
                }
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: event.target.value,
                  }))
                }
              />
            </Field>
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={
                passwordStrength.checks.minLength ? "secondary" : "outline"
              }
            >
              12+ chars
            </Badge>
            <Badge
              variant={
                passwordStrength.checks.uppercase ? "secondary" : "outline"
              }
            >
              Uppercase
            </Badge>
            <Badge
              variant={
                passwordStrength.checks.lowercase ? "secondary" : "outline"
              }
            >
              Lowercase
            </Badge>
            <Badge
              variant={passwordStrength.checks.number ? "secondary" : "outline"}
            >
              Number
            </Badge>
            <Badge
              variant={
                passwordStrength.checks.special ? "secondary" : "outline"
              }
            >
              Symbol
            </Badge>
          </div>
          <Button onClick={updatePassword} disabled={isUpdatingPassword}>
            {isUpdatingPassword ? "Updating..." : "Update password"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Health</CardTitle>
          <CardDescription>
            Real-time security metrics for your account activity
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoadingHealth || !accountHealth ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-sm text-muted-foreground">Password age</p>
                <p className="text-lg font-semibold">
                  {accountHealth.passwordAgeDays} days
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-sm text-muted-foreground">2FA status</p>
                <p className="text-lg font-semibold">
                  {accountHealth.isTwoFactorEnabled ? "Enabled" : "Not enabled"}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-sm text-muted-foreground">Last login</p>
                <p className="text-lg font-semibold">
                  {accountHealth.lastLoginAt
                    ? new Date(accountHealth.lastLoginAt).toLocaleString()
                    : "No login record"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {accountHealth.lastLoginIp || "IP unavailable"}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-sm text-muted-foreground">Failed logins</p>
                <p className="text-lg font-semibold">
                  {accountHealth.failedLoginCount}
                </p>
              </div>
              <div className="rounded-md border p-3 md:col-span-2">
                <p className="text-sm text-muted-foreground">
                  Unusual activity flags
                </p>
                {accountHealth.unusualActivityFlags.length === 0 ? (
                  <p className="text-lg font-semibold">
                    No unusual activity detected
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {accountHealth.unusualActivityFlags.map((flag) => (
                      <Badge key={flag} variant="destructive">
                        {flag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
