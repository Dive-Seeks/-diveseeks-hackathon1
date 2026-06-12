"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

export default function LogoutPage() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    // Perform logout logic
    logout();

    // Clear any local storage/cookies if needed beyond what the store does

    toast.success("Successfully logged out!");

    // Redirect after a brief delay for a better UX
    const timer = setTimeout(() => {
      router.push("/login");
    }, 1000);

    return () => clearTimeout(timer);
  }, [logout, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center space-y-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Logging out...
        </h1>
        <p className="text-gray-500">
          Clearing your session data and redirecting you to login.
        </p>
      </div>
    </div>
  );
}
