"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import api from "@/lib/api";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: "system" | "billing" | "security" | "product";
  channel: "in_app" | "email" | "push";
  isRead: boolean;
  createdAt: string;
};

type NotificationPreferences = {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  billingAlertsEnabled: boolean;
  securityAlertsEnabled: boolean;
  productUpdatesEnabled: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailEnabled: true,
  pushEnabled: false,
  inAppEnabled: true,
  billingAlertsEnabled: true,
  securityAlertsEnabled: true,
  productUpdatesEnabled: true,
};

export default function NotificationsPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(
    [],
  );
  const [preferences, setPreferences] =
    React.useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [unreadOnly, setUnreadOnly] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [listResponse, preferencesResponse] = await Promise.all([
        api.get("/notifications", {
          params: {
            page: 1,
            limit: 20,
            unreadOnly,
          },
        }),
        api.get("/notifications/preferences"),
      ]);
      setNotifications((listResponse.data.data || []) as NotificationItem[]);
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...(preferencesResponse.data.data || {}),
      });
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [unreadOnly]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const savePreferences = async () => {
    setIsSavingPreferences(true);
    try {
      const response = await api.patch(
        "/notifications/preferences",
        preferences,
      );
      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...(response.data.data || {}),
      });
      toast.success("Notification preferences updated");
    } catch {
      toast.error("Failed to update preferences");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      toast.success("All notifications marked as read");
      await loadData();
    } catch {
      toast.error("Failed to mark notifications");
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
    } catch {
      toast.error("Failed to mark notification");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Manage alerts and review recent events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={unreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setUnreadOnly((prev) => !prev)}
          >
            {unreadOnly ? "Unread only" : "All"}
          </Button>
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Choose how and when you receive updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup>
            <Field
              orientation="horizontal"
              className="items-center justify-between"
            >
              <FieldLabel htmlFor="notify-email">
                Email notifications
              </FieldLabel>
              <Switch
                id="notify-email"
                checked={preferences.emailEnabled}
                onCheckedChange={(value) =>
                  setPreferences((prev) => ({ ...prev, emailEnabled: value }))
                }
              />
            </Field>
            <Field
              orientation="horizontal"
              className="items-center justify-between"
            >
              <FieldLabel htmlFor="notify-push">Push notifications</FieldLabel>
              <Switch
                id="notify-push"
                checked={preferences.pushEnabled}
                onCheckedChange={(value) =>
                  setPreferences((prev) => ({ ...prev, pushEnabled: value }))
                }
              />
            </Field>
            <Field
              orientation="horizontal"
              className="items-center justify-between"
            >
              <FieldLabel htmlFor="notify-in-app">
                In-app notifications
              </FieldLabel>
              <Switch
                id="notify-in-app"
                checked={preferences.inAppEnabled}
                onCheckedChange={(value) =>
                  setPreferences((prev) => ({ ...prev, inAppEnabled: value }))
                }
              />
            </Field>
            <Field
              orientation="horizontal"
              className="items-center justify-between"
            >
              <FieldLabel htmlFor="notify-billing">Billing alerts</FieldLabel>
              <Switch
                id="notify-billing"
                checked={preferences.billingAlertsEnabled}
                onCheckedChange={(value) =>
                  setPreferences((prev) => ({
                    ...prev,
                    billingAlertsEnabled: value,
                  }))
                }
              />
            </Field>
            <Field
              orientation="horizontal"
              className="items-center justify-between"
            >
              <FieldLabel htmlFor="notify-security">Security alerts</FieldLabel>
              <Switch
                id="notify-security"
                checked={preferences.securityAlertsEnabled}
                onCheckedChange={(value) =>
                  setPreferences((prev) => ({
                    ...prev,
                    securityAlertsEnabled: value,
                  }))
                }
              />
            </Field>
            <Field
              orientation="horizontal"
              className="items-center justify-between"
            >
              <FieldLabel htmlFor="notify-product-updates">
                Product updates
              </FieldLabel>
              <Switch
                id="notify-product-updates"
                checked={preferences.productUpdatesEnabled}
                onCheckedChange={(value) =>
                  setPreferences((prev) => ({
                    ...prev,
                    productUpdatesEnabled: value,
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
          <CardTitle>Inbox</CardTitle>
          <CardDescription>
            Recent account and billing notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No notifications found
            </p>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border p-3 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    <Badge variant="outline">{item.type}</Badge>
                    {!item.isRead && <Badge>Unread</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                {!item.isRead && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAsRead(item.id)}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
