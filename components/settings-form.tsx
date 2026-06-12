"use client";

import * as React from "react";
import { BellIcon, MailIcon, SmartphoneIcon, UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type SettingsFormValues = {
  fullName: string;
  email: string;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyPush: boolean;
};

type SettingsFormProps = {
  defaultValues?: Partial<SettingsFormValues>;
  onSubmit?: (values: SettingsFormValues) => Promise<void> | void;
};

export function SettingsForm({ defaultValues, onSubmit }: SettingsFormProps) {
  const [values, setValues] = React.useState<SettingsFormValues>({
    fullName: defaultValues?.fullName ?? "",
    email: defaultValues?.email ?? "",
    notifyEmail: defaultValues?.notifyEmail ?? true,
    notifySms: defaultValues?.notifySms ?? false,
    notifyPush: defaultValues?.notifyPush ?? true,
  });
  const [errors, setErrors] = React.useState<
    Partial<Record<"fullName" | "email", string>>
  >({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const validate = React.useCallback(() => {
    const nextErrors: Partial<Record<"fullName" | "email", string>> = {};

    if (!values.fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!values.email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [values.email, values.fullName]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit?.(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-background p-6"
    >
      <FieldGroup className="gap-5">
        <Field data-invalid={!!errors.fullName}>
          <FieldLabel htmlFor="settings-full-name">
            <UserIcon />
            Full Name
          </FieldLabel>
          <Input
            id="settings-full-name"
            value={values.fullName}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, fullName: event.target.value }))
            }
            aria-invalid={!!errors.fullName}
          />
          <FieldError>{errors.fullName}</FieldError>
        </Field>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="settings-email">
            <MailIcon />
            Email Address
          </FieldLabel>
          <Input
            id="settings-email"
            type="email"
            value={values.email}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, email: event.target.value }))
            }
            aria-invalid={!!errors.email}
          />
          <FieldError>{errors.email}</FieldError>
        </Field>

        <FieldGroup className="rounded-lg border p-4">
          <FieldDescription className="text-sm font-medium text-foreground">
            Notification Preferences
          </FieldDescription>
          <Field orientation="horizontal">
            <FieldLabel htmlFor="notify-email">Email notifications</FieldLabel>
            <Switch
              id="notify-email"
              checked={values.notifyEmail}
              onCheckedChange={(checked) =>
                setValues((prev) => ({ ...prev, notifyEmail: checked }))
              }
              aria-label="Toggle email notifications"
            />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel htmlFor="notify-sms">
              <SmartphoneIcon />
              SMS notifications
            </FieldLabel>
            <Switch
              id="notify-sms"
              checked={values.notifySms}
              onCheckedChange={(checked) =>
                setValues((prev) => ({ ...prev, notifySms: checked }))
              }
              aria-label="Toggle SMS notifications"
            />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel htmlFor="notify-push">
              <BellIcon />
              Push notifications
            </FieldLabel>
            <Switch
              id="notify-push"
              checked={values.notifyPush}
              onCheckedChange={(checked) =>
                setValues((prev) => ({ ...prev, notifyPush: checked }))
              }
              aria-label="Toggle push notifications"
            />
          </Field>
        </FieldGroup>

        <Button type="submit" disabled={isSubmitting}>
          Save Settings
        </Button>
      </FieldGroup>
    </form>
  );
}
