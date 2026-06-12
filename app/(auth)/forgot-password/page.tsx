"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
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
import { useForgotPasswordMutation } from "@/lib/api/hooks";
import { forgotPasswordSchema } from "@/lib/api/schemas";

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const forgotPasswordMutation = useForgotPasswordMutation();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setIsLoading(true);
    try {
      await forgotPasswordMutation.mutateAsync({ email: values.email });

      setIsSubmitted(true);
      toast.success("Password reset email sent!");
    } catch (error: unknown) {
      const message =
        extractApiError(error).message || "Failed to send password reset email";
      toast.error(message);
      form.setError("root", { message });
    } finally {
      setIsLoading(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-gray-500 mt-2">
              We&apos;ve sent a password reset link to{" "}
              <span className="font-semibold">{form.getValues("email")}</span>.
              Please check your inbox and follow the instructions.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-4 pt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/login")}
            >
              Back to Sign In
            </Button>
            <p className="text-sm text-gray-500">
              Didn&apos;t receive the email?{" "}
              <button
                className="text-blue-600 hover:underline font-medium"
                onClick={() => setIsSubmitted(false)}
              >
                Try again
              </button>
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-start mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto text-gray-500 hover:text-gray-900"
              onClick={() => router.push("/login")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Forgot Password
          </CardTitle>
          <CardDescription className="text-gray-500">
            Enter your email and we&apos;ll send you a link to reset your
            password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="name@example.com"
                          className="pl-10"
                          {...field}
                          autoComplete="email"
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
                    Sending Link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
