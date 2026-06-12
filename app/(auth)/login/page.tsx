"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Loader2, Lock, Mail, Eye, EyeOff, Code, Briefcase,
  ChevronRight, Zap, Shield, Brain, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { isAxiosError } from "axios";

import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/lib/auth-store";
import { authApi } from "@/lib/api/endpoints";
import { extractApiError } from "@/lib/api/errors";
import { useLoginMutation } from "@/lib/api/hooks";
import { loginFormSchema } from "@/lib/api/schemas";

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const roleParam = searchParams.get("role");
  const selectedRole: "coder" | "business" | null =
    roleParam === "coder" || roleParam === "business" ? roleParam : null;

  const loginMutation = useLoginMutation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  async function onResendVerification() {
    const email = form.getValues("email");
    if (!email || !loginFormSchema.shape.email.safeParse(email).success) {
      toast.error("Please enter a valid email address first");
      form.setFocus("email");
      return;
    }
    setIsResending(true);
    try {
      await authApi.sendVerificationEmail(email);
      toast.success("Verification email resent! Please check your inbox.");
      setShowResend(false);
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || "Failed to resend verification email");
    } finally {
      setIsResending(false);
    }
  }

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      const response = await loginMutation.mutateAsync({
        email: values.email,
        password: values.password,
      });

      const { user, accessToken, refreshToken } = response;

      if (selectedRole === "coder" && !user.isCoder) {
        toast.error("This account does not have Coder access.");
      } else if (selectedRole === "business" && !user.isBusiness) {
        toast.error("This account does not have Business access.");
      }

      const normalizedUser = {
        ...user,
        isVerified: user.isVerified ?? false,
        role: user.role ?? "CASHIER",
        isCoder: user.isCoder ?? false,
        isBusiness: user.isBusiness ?? false,
        tenantId: user.tenantId ?? "",
      };

      setAuth(normalizedUser, accessToken, refreshToken);
      toast.success("Access granted.");

      let destination = "/dashboard";
      if (selectedRole === "coder" && normalizedUser.isCoder) destination = "/coding";
      else if (selectedRole === "business" && normalizedUser.isBusiness) destination = "/dashboard";
      else if (normalizedUser.isCoder && !normalizedUser.isBusiness) destination = "/coding";

      setTimeout(() => router.push(destination), 150);
    } catch (error: unknown) {
      if (isAxiosError(error)) console.error("Login error:", error.response?.data);
      let message = extractApiError(error).message || "Invalid credentials";
      if (message.toLowerCase().includes("verify your email")) setShowResend(true);
      if (message.toLowerCase().includes("temporarily locked")) {
        message = `${message}. Reset your password to unlock immediately.`;
      }
      toast.error(message);
      form.setError("root", { message });
    } finally {
      setIsLoading(false);
    }
  }

  const isCoder = selectedRole === "coder";
  const isBusiness = selectedRole === "business";

  const accent = {
    coder: {
      activeCard:  "border-indigo-500/50 shadow-[0_0_24px_rgba(99,102,241,0.18)]",
      idleCard:    "border-zinc-800 hover:border-indigo-500/30 hover:shadow-[0_0_16px_rgba(99,102,241,0.08)]",
      icon:        "bg-indigo-500/15 border-indigo-500/30 text-indigo-400",
      iconIdle:    "bg-zinc-900 border-zinc-800 text-zinc-500 group-hover:border-indigo-500/30 group-hover:text-indigo-400",
      tag:         "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      tagIdle:     "bg-zinc-900/50 border-zinc-800 text-zinc-600",
      label:       "text-indigo-400",
      topLine:     "via-indigo-500/50",
      panelBorder: "border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.12)]",
      badge:       "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
      dot:         "bg-indigo-400",
      inputFocus:  "focus:border-indigo-500/60",
      button:      "bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)]",
      resend:      "text-indigo-400 hover:text-indigo-300",
      glow:        "from-indigo-500/8",
    },
    business: {
      activeCard:  "border-emerald-500/50 shadow-[0_0_24px_rgba(16,185,129,0.15)]",
      idleCard:    "border-zinc-800 hover:border-emerald-500/30 hover:shadow-[0_0_16px_rgba(16,185,129,0.07)]",
      icon:        "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
      iconIdle:    "bg-zinc-900 border-zinc-800 text-zinc-500 group-hover:border-emerald-500/30 group-hover:text-emerald-400",
      tag:         "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      tagIdle:     "bg-zinc-900/50 border-zinc-800 text-zinc-600",
      label:       "text-emerald-400",
      topLine:     "via-emerald-500/50",
      panelBorder: "border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.10)]",
      badge:       "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      dot:         "bg-emerald-400",
      inputFocus:  "focus:border-emerald-500/60",
      button:      "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_30px_rgba(16,185,129,0.55)]",
      resend:      "text-emerald-400 hover:text-emerald-300",
      glow:        "from-emerald-500/6",
    },
  };

  const a = selectedRole ? accent[selectedRole] : null;

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 relative overflow-hidden flex items-center">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.013)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.013)_1px,transparent_1px)] bg-[size:40px_40px]" />
      {/* Role glow */}
      {a && (
        <div className={`absolute inset-0 bg-gradient-to-r ${a.glow} to-transparent transition-all duration-700 pointer-events-none`} />
      )}
      {/* Ambient orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/4 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/3 rounded-full blur-3xl pointer-events-none" />

      {/* ── Page shell ── */}
      <div className="relative z-10 w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-8">

        {/* Mobile: stack vertically. Desktop: side-by-side */}
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 lg:gap-8">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col gap-5 lg:w-[42%] lg:flex-shrink-0">

            {/* Brand */}
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-zinc-700/50 bg-zinc-900/60 text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-medium mb-3 font-[family-name:var(--font-display)]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                DiveSeeks · Neural Access
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-[1.15] mb-1.5 font-[family-name:var(--font-display)] tracking-[-0.0125em]">
                Every competitor<br />
                does what you say.
                <span className="block text-zinc-600 font-semibold mt-0.5">
                  DiveSeeks does<br />what your project needs.
                </span>
              </h1>
              <p className="text-zinc-500 text-sm">Select your access node to continue.</p>
            </div>

            {/* Role cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Coder */}
              <button
                onClick={() => router.push("/login?role=coder")}
                className={`group relative flex flex-col p-4 rounded-xl border text-left transition-all duration-300 overflow-hidden bg-zinc-950/70 ${
                  isCoder ? accent.coder.activeCard : accent.coder.idleCard
                }`}
              >
                <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${accent.coder.topLine} to-transparent transition-opacity duration-300 ${isCoder ? "opacity-100" : "opacity-0 group-hover:opacity-60"}`} />
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-3 transition-all duration-300 ${isCoder ? accent.coder.icon : accent.coder.iconIdle}`}>
                  <Code className="w-4 h-4" />
                </div>
                <p className={`text-sm font-bold mb-0.5 font-[family-name:var(--font-display)] tracking-[0.02em] ${isCoder ? "text-white" : "text-zinc-300"}`}>The Coder</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">AI agents & orchestration.</p>
                <div className="flex flex-wrap gap-1 mt-auto">
                  {["Abigail AI", "10 Agents"].map(t => (
                    <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${isCoder ? accent.coder.tag : accent.coder.tagIdle}`}>{t}</span>
                  ))}
                </div>
                {isCoder && <p className={`mt-2 text-[10px] font-bold flex items-center gap-0.5 ${accent.coder.label}`}>Selected <ChevronRight className="w-3 h-3" /></p>}
              </button>

              {/* Business */}
              <button
                onClick={() => router.push("/login?role=business")}
                className={`group relative flex flex-col p-4 rounded-xl border text-left transition-all duration-300 overflow-hidden bg-zinc-950/70 ${
                  isBusiness ? accent.business.activeCard : accent.business.idleCard
                }`}
              >
                <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${accent.business.topLine} to-transparent transition-opacity duration-300 ${isBusiness ? "opacity-100" : "opacity-0 group-hover:opacity-60"}`} />
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-3 transition-all duration-300 ${isBusiness ? accent.business.icon : accent.business.iconIdle}`}>
                  <Briefcase className="w-4 h-4" />
                </div>
                <p className={`text-sm font-bold mb-0.5 font-[family-name:var(--font-display)] tracking-[0.02em] ${isBusiness ? "text-white" : "text-zinc-300"}`}>The Business</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">POS & sales analytics.</p>
                <div className="flex flex-wrap gap-1 mt-auto">
                  {["Multi-Store", "POS"].map(t => (
                    <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${isBusiness ? accent.business.tag : accent.business.tagIdle}`}>{t}</span>
                  ))}
                </div>
                {isBusiness && <p className={`mt-2 text-[10px] font-bold flex items-center gap-0.5 ${accent.business.label}`}>Selected <ChevronRight className="w-3 h-3" /></p>}
              </button>
            </div>

            {/* Trust + link */}
            <div className="flex items-center gap-4">
              {[{ icon: Shield, label: "Encrypted" }, { icon: Zap, label: "12ms" }, { icon: Brain, label: "Zero GPU" }].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1 text-[11px] text-zinc-600">
                  <Icon className="w-3 h-3" />{label}
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-600 -mt-1">
              No account?{" "}
              <button onClick={() => router.push("/register")} className="text-zinc-400 hover:text-white transition-colors font-medium underline underline-offset-4">
                Create one free
              </button>
            </p>
          </div>

          {/* ── RIGHT COLUMN: Form panel ── */}
          <div className={`relative flex-1 rounded-2xl border bg-zinc-950/80 backdrop-blur-sm transition-all duration-500 ${
            selectedRole ? `${a!.panelBorder} opacity-100` : "border-zinc-800/50 opacity-40 pointer-events-none"
          }`}>
            {/* Top accent line */}
            {a && <div className={`absolute top-0 inset-x-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent ${a.topLine} to-transparent`} />}

            {!selectedRole ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[320px] gap-3 text-center px-6">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-zinc-600" />
                </div>
                <p className="text-sm font-semibold text-zinc-400">Select a path to continue</p>
                <p className="text-xs text-zinc-600">Choose Coder or Business</p>
              </div>
            ) : (
              <div className="p-6 sm:p-7">
                {/* Form header */}
                <div className="mb-5">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-[0.18em] font-bold mb-3 font-[family-name:var(--font-display)] ${a!.badge}`}>
                    <div className={`w-1 h-1 rounded-full ${a!.dot}`} />
                    {selectedRole} mode
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1 font-[family-name:var(--font-display)] tracking-[-0.0125em]">Sign in</h2>
                  <p className="text-zinc-500 text-sm">
                    {isCoder ? "Access your AI coding environment" : "Access your business dashboard"}
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-medium font-[family-name:var(--font-display)]">Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
                              <Input
                                placeholder="you@company.com"
                                className={`pl-10 h-10 bg-zinc-900/80 border-zinc-700/60 text-white placeholder:text-zinc-700 rounded-xl text-sm transition-all ${a!.inputFocus}`}
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-medium font-[family-name:var(--font-display)]">Password</FormLabel>
                            <button type="button" onClick={() => router.push("/forgot-password")} className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
                              Forgot?
                            </button>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••••"
                                className={`pl-10 pr-10 h-10 bg-zinc-900/80 border-zinc-700/60 text-white placeholder:text-zinc-700 rounded-xl text-sm transition-all ${a!.inputFocus}`}
                                {...field}
                              />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors">
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="rememberMe"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-zinc-700 rounded data-[state=checked]:bg-zinc-200 data-[state=checked]:border-zinc-200 data-[state=checked]:text-black"
                          />
                          <label htmlFor="rememberMe" className="text-xs text-zinc-500 cursor-pointer select-none">
                            Keep me signed in for 30 days
                          </label>
                        </div>
                      )}
                    />

                    {showResend && (
                      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between gap-3">
                        <p className="text-xs text-amber-400">Email not verified</p>
                        <button type="button" onClick={onResendVerification} disabled={isResending} className={`text-xs font-semibold transition-colors ${a!.resend}`}>
                          {isResending ? "Sending..." : "Resend link"}
                        </button>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${a!.button}`}
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Authenticate <ChevronRight className="w-4 h-4" /></>}
                    </button>
                  </form>
                </Form>

                <div className="mt-5 pt-4 border-t border-zinc-800/60 text-center">
                  <p className="text-xs text-zinc-600">
                    No account?{" "}
                    <button onClick={() => router.push("/register")} className="text-zinc-400 hover:text-white transition-colors font-medium underline underline-offset-4">
                      Create one in 60 seconds
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
