"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.isCoder) {
        router.push("/coding");
      } else {
        router.push("/dashboard");
      }
    } else if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-gray-500 font-medium">Initializing application...</p>
      </div>
    </div>
  );
}
