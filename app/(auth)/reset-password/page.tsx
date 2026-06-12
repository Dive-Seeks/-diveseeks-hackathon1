"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Loader2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { extractApiError } from "@/lib/api/errors";
import { useResetPasswordMutation } from "@/lib/api/hooks";
import {
  resetPasswordSchema as resetPasswordRequestSchema,
  securePasswordSchema,
} from "@/lib/api/schemas";

const resetPasswordFormSchema = z
  .object({
    password: securePasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const userId = searchParams.get("userId");

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const resetPasswordMutation = useResetPasswordMutation();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!token || !userId) {
      toast.error("Invalid or missing reset token or user information");
    }
  }, [token, userId]);

  async function onSubmit(values: ResetPasswordFormValues) {
    if (!token || !userId) {
      toast.error(
        "Cannot reset password without valid token and user information",
      );
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        token,
        userId,
        newPassword: values.password,
        confirmPassword: values.confirmPassword,
      };

      const parsedPayload = resetPasswordRequestSchema.safeParse(payload);
      if (!parsedPayload.success) {
        const parsedErrors = parsedPayload.error.flatten();
        const firstError =
          parsedErrors.formErrors[0] ||
          Object.values(parsedErrors.fieldErrors).flat()[0] ||
          "Invalid reset password request";
        toast.error(firstError);
        form.setError("root", { message: firstError });
        return;
      }

      await resetPasswordMutation.mutateAsync({
        token,
        userId,
        newPassword: values.password,
      });

      setIsSuccess(true);
      toast.success("Password successfully reset!");
    } catch (error: unknown) {
      const message =
        extractApiError(error).message || "Failed to reset password";
      toast.error(message);
      form.setError("root", { message });
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Password Reset
          </CardTitle>
          <CardDescription className="text-gray-500 mt-2">
            Your password has been successfully reset. You can now sign in with
            your new password.
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-6">
          <Button
            className="w-full font-semibold"
            onClick={() => router.push("/login")}
          >
            Go to Sign In
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!token) {
    return (
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-3">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Invalid Token
          </CardTitle>
          <CardDescription className="text-gray-500 mt-2">
            The password reset link is invalid or has expired. Please request a
            new one.
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/forgot-password")}
          >
            Request New Link
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-bold tracking-tight">
          Reset Password
        </CardTitle>
        <CardDescription className="text-gray-500">
          Enter your new password below to reset your account access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        {...field}
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10"
                        {...field}
                        autoComplete="new-password"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Suspense
        fallback={<Loader2 className="h-10 w-10 animate-spin text-blue-600" />}
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
