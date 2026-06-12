"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  BanknoteIcon,
  CreditCard,
  Wallet,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";

export default function PaymentMethodsPage() {
  const router = useRouter();
  const [worldpayStatus, setWorldpayStatus] = useState("Not Connected");
  const [vivaStatus, setVivaStatus] = useState("Not Connected");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectAccount = () => {
    router.push("/integrate-payment/methods/worldpay-onboarding");
  };

  const handleVivaOnboarding = () => {
    router.push("/integrate-payment/methods/viva-onboarding");
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Image
              src="/diveseek-logo.svg"
              alt="Dive Seeks"
              width={150}
              height={40}
              className="object-contain"
            />
            <Badge variant="outline" className="bg-primary/5 text-primary">
              Partner Portal
            </Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Payment Methods</h2>
          <p className="text-muted-foreground mt-2">
            Manage your store payment integrations and transaction methods.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Method
          </Button>
        </div>
      </div>

      <Separator />

      <div className="space-y-8">
        {/* POS Payments Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              POS Payments (Recommended)
            </h3>
            <p className="text-sm text-muted-foreground">
              Preferred solutions for in-store point-of-sale transactions.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Worldpay Card */}
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    Worldpay
                  </CardTitle>
                  <CardDescription>
                    Enterprise payment processing
                  </CardDescription>
                </div>
                <div className="bg-muted p-2 rounded-md border flex items-center justify-center">
                  <Image
                    src="/worldpay/worldpay-main-red.svg"
                    alt="Worldpay Logo"
                    width={100}
                    height={40}
                    className="object-contain h-8 w-auto"
                  />
                </div>
              </CardHeader>
              <Separator className="mx-6 w-auto" />
              <CardContent className="flex-1 pt-4">
                <div className="text-2xl font-bold text-muted-foreground">
                  {worldpayStatus}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Process payments globally with Worldpay integration.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        worldpayStatus === "Connected" ? "default" : "secondary"
                      }
                      className={
                        worldpayStatus === "Connected"
                          ? "bg-foreground text-background"
                          : ""
                      }
                    >
                      {worldpayStatus === "Connected"
                        ? "Connected"
                        : "Pending Setup"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleConnectAccount}>
                  Connect Account
                </Button>
              </CardFooter>
            </Card>

            {/* Viva Card */}
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    Viva.com
                  </CardTitle>
                  <CardDescription>
                    Seamless POS payment processing
                  </CardDescription>
                </div>
                <div className="bg-muted p-2 rounded-md border flex items-center justify-center">
                  <Image
                    src="/Viva Wallet Logo/Viva Wallet Logo2.png"
                    alt="Viva Wallet Logo"
                    width={100}
                    height={40}
                    className="object-contain h-8 w-auto"
                  />
                </div>
              </CardHeader>
              <Separator className="mx-6 w-auto" />
              <CardContent className="flex-1 pt-4">
                <div className="text-2xl font-bold text-muted-foreground">
                  {vivaStatus}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  White-labeled payment solution powered by Viva.com.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Badge
                    variant={
                      vivaStatus === "Connected" ? "default" : "secondary"
                    }
                    className={
                      vivaStatus === "Connected"
                        ? "bg-foreground text-background w-fit"
                        : "w-fit"
                    }
                  >
                    {vivaStatus === "Connected" ? "Connected" : "Pending Setup"}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={handleVivaOnboarding}
                  disabled={isConnecting}
                >
                  {isConnecting ? "Generating Invite..." : "Connect Account"}
                </Button>
              </CardFooter>
            </Card>

            {/* Cash / Manual Card */}
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    Cash Payments
                  </CardTitle>
                  <CardDescription>In-store manual collection</CardDescription>
                </div>
                <BanknoteIcon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <Separator className="mx-6 w-auto" />
              <CardContent className="flex-1 pt-4">
                <div className="text-2xl font-bold">Enabled</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Allow cash handling and custom split payments at the till.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="outline">Manual Process</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Configure Till Limits
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>

        <Separator />

        {/* Other Payments Section */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">
              Other Payments
            </h3>
            <p className="text-sm text-muted-foreground">
              Additional payment gateways and manual collection methods.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Stripe Card */}
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    Stripe Integration
                  </CardTitle>
                  <CardDescription>Primary payment gateway</CardDescription>
                </div>
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <Separator className="mx-6 w-auto" />
              <CardContent className="flex-1 pt-4">
                <div className="text-2xl font-bold">Active</div>
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-semibold">Pricing:</p>
                  <p className="text-xs text-muted-foreground">
                    2.5% + 20p (EEA Cards)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    3.25% + 20p (International Cards)
                  </p>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Accepting credit cards, Apple Pay, and Google Pay.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Badge
                    variant="default"
                    className="bg-foreground text-background"
                  >
                    Connected
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Manage Settings <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>

            {/* PayPal Card */}
            <Card className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">
                    PayPal
                  </CardTitle>
                  <CardDescription>Digital wallet payments</CardDescription>
                </div>
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <Separator className="mx-6 w-auto" />
              <CardContent className="flex-1 pt-4">
                <div className="text-2xl font-bold text-muted-foreground">
                  Not Connected
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-semibold">Fees:</p>
                  <p className="text-xs text-muted-foreground">
                    2.9% + £0.30 (Standard commercial transactions)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Free (Personal transfers between friends/family in the UK)
                  </p>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Accept PayPal and Venmo payments directly.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="secondary">Pending Setup</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Connect Account</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
