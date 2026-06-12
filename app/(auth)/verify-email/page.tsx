"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import api from "@/lib/api";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const userId = searchParams.get("userId");
  const hasRequiredParams = Boolean(token && userId);

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    hasRequiredParams ? "verifying" : "error",
  );
  const [errorMessage, setErrorMessage] = useState(
    hasRequiredParams
      ? ""
      : "Verification token or user ID is missing. Please check your email and try again.",
  );

  useEffect(() => {
    if (!hasRequiredParams) {
      return;
    }

    const verifyEmail = async () => {
      console.log(
        "VerifyEmailContent: Attempting API call to /auth/verify-email",
      );
      try {
        const response = await api.get(
          `/auth/verify-email?token=${token}&userId=${userId}`,
        );
        console.log("VerifyEmailContent: API call successful", response.data);
        setStatus("success");
        toast.success("Email successfully verified!");
      } catch (error: any) {
        console.error("VerifyEmailContent: API call failed", error);
        setStatus("error");
        const message =
          error.response?.data?.message ||
          "Failed to verify email. The link might be invalid or expired.";
        setErrorMessage(message);
        toast.error(message);
      }
    };

    verifyEmail();
  }, [hasRequiredParams, token, userId]);

  if (status === "verifying") {
    return (
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Verifying Email
          </CardTitle>
          <CardDescription className="text-gray-500 mt-2">
            Please wait while we verify your email address. This will only take
            a moment.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card className="w-full max-w-md shadow-lg text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Email Verified!
          </CardTitle>
          <CardDescription className="text-gray-500 mt-2">
            Your email has been successfully verified. You can now access all
            features of your account.
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-6">
          <Button
            className="w-full font-semibold"
            onClick={() => router.push("/login")}
          >
            Sign In to Your Account
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg text-center">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          Verification Failed
        </CardTitle>
        <CardDescription className="text-gray-500 mt-2">
          {errorMessage}
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
          Need a new verification email?{" "}
          <Button
            variant="link"
            className="h-auto p-0 text-blue-600 hover:underline font-medium"
            onClick={() => router.push("/login")} // Assuming user can resend from login or profile
          >
            Resend Link
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Suspense
        fallback={<Loader2 className="h-10 w-10 animate-spin text-blue-600" />}
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
