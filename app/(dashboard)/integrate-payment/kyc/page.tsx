"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  UploadCloud,
  ShieldAlert,
  CheckCircle2,
  FileText,
  X,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export default function InternalKycPage() {
  const [idFile, setIdFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "id" | "bank",
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      if (type === "id") setIdFile(e.target.files[0]);
      else setBankFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    type: "id" | "bank",
  ) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (type === "id") setIdFile(e.dataTransfer.files[0]);
      else setBankFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = (type: "id" | "bank") => {
    if (type === "id") setIdFile(null);
    else setBankFile(null);
  };

  const handleUpload = async () => {
    if (!idFile || !bankFile) {
      toast.error("Please select both documents to upload.");
      return;
    }

    try {
      setIsUploading(true);

      // Simulating internal upload to FTP service as per fallback plan
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setIsSuccess(true);
      toast.success("KYC documents uploaded successfully.");
    } catch (_error) {
      toast.error("Failed to upload KYC documents.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-background/50">
      <div className="max-w-3xl mx-auto space-y-8 p-4 md:p-8 pt-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              router.push("/integrate-payment/methods/worldpay-onboarding")
            }
            className="h-10 w-10 shrink-0 rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              KYC Verification
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload your identity documents to verify your business and unlock
              full payment processing capabilities.
            </p>
          </div>
        </div>

        {/* Warning Alert */}
        <Alert className="bg-muted/10 text-foreground border-border relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-foreground/20" />
          <ShieldAlert className="h-5 w-5 text-foreground/80" />
          <AlertTitle className="text-foreground font-semibold tracking-tight text-base">
            Internal Storage Notice
          </AlertTitle>
          <AlertDescription className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
            This is an internal upload portal. Documents uploaded here are
            securely stored on our internal servers (via FTP) for compliance
            review and are not directly transmitted to Worldpay&apos;s automated
            systems.
          </AlertDescription>
        </Alert>

        {/* Upload Card */}
        <Card className="border-border overflow-hidden bg-card/50 backdrop-blur-sm transition-all duration-200">
          <CardHeader className="bg-muted/5 border-b border-border/40 pb-5">
            <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <FileText className="h-5 w-5 text-primary" />
              Required Documents
            </CardTitle>
            <CardDescription className="text-base mt-1.5">
              Please upload both a valid government-issued ID and a Proof of
              Bank document to complete your verification.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center ring-[12px] ring-muted/50">
                  <CheckCircle2 className="h-10 w-10 text-foreground" />
                </div>
                <div className="space-y-3 max-w-md">
                  <h3 className="font-bold text-2xl text-foreground tracking-tight">
                    Documents Submitted
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">
                    Your documents have been securely uploaded and are now
                    pending review by our compliance team. We will notify you
                    once the review is complete.
                  </p>
                </div>
                <div className="pt-6 flex gap-4 w-full max-w-sm">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      router.push(
                        "/integrate-payment/methods/worldpay-onboarding",
                      )
                    }
                  >
                    Status
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => router.push("/integrate-payment/methods")}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <FieldGroup className="space-y-10">
                {/* 1. ID Document */}
                <Field>
                  <div className="mb-4">
                    <FieldLabel className="text-base font-semibold text-foreground">
                      1. Identity Document
                    </FieldLabel>
                    <p className="text-sm text-muted-foreground mt-1">
                      Passport, Driver&apos;s License, or National ID
                    </p>
                  </div>

                  {!idFile ? (
                    <div
                      className="mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 px-6 py-10 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 group cursor-pointer"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, "id")}
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background border border-primary/10 mb-4 group-hover:scale-105 transition-transform duration-300">
                        <UploadCloud
                          className="h-8 w-8 text-primary"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="text-center space-y-2">
                        <div className="flex text-base leading-6 text-muted-foreground justify-center items-center gap-1">
                          <label
                            htmlFor="id-file-upload"
                            className="relative cursor-pointer rounded-md font-semibold text-primary focus-within:outline-none hover:text-primary/80 transition-colors"
                          >
                            <span>Click to upload</span>
                            <Input
                              id="id-file-upload"
                              name="id-file-upload"
                              type="file"
                              className="sr-only"
                              onChange={(e) => handleFileChange(e, "id")}
                              accept=".pdf,.jpg,.jpeg,.png"
                            />
                          </label>
                          <p>or drag and drop</p>
                        </div>
                        <p className="text-sm text-muted-foreground/70">
                          Supported formats: PDF, PNG, JPG (max 10MB)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 rounded-2xl border border-border/60 bg-background p-5 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center gap-5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/10">
                          <FileText className="h-7 w-7 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-medium text-foreground truncate max-w-[220px] sm:max-w-sm">
                            {idFile.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="px-2 py-0.5 text-xs font-normal bg-muted text-muted-foreground"
                            >
                              {(idFile.size / 1024 / 1024).toFixed(2)} MB
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              • Ready to upload
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFile("id")}
                        disabled={isUploading}
                        className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </Field>

                {/* 2. Bank Document */}
                <Field>
                  <div className="mb-4">
                    <FieldLabel className="text-base font-semibold text-foreground">
                      2. Proof of Bank
                    </FieldLabel>
                    <p className="text-sm text-muted-foreground mt-1">
                      Recent bank statement or voided check showing business
                      details
                    </p>
                  </div>

                  {!bankFile ? (
                    <div
                      className="mt-2 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 px-6 py-10 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 group cursor-pointer"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, "bank")}
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background border border-primary/10 mb-4 group-hover:scale-105 transition-transform duration-300">
                        <UploadCloud
                          className="h-8 w-8 text-primary"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="text-center space-y-2">
                        <div className="flex text-base leading-6 text-muted-foreground justify-center items-center gap-1">
                          <label
                            htmlFor="bank-file-upload"
                            className="relative cursor-pointer rounded-md font-semibold text-primary focus-within:outline-none hover:text-primary/80 transition-colors"
                          >
                            <span>Click to upload</span>
                            <Input
                              id="bank-file-upload"
                              name="bank-file-upload"
                              type="file"
                              className="sr-only"
                              onChange={(e) => handleFileChange(e, "bank")}
                              accept=".pdf,.jpg,.jpeg,.png"
                            />
                          </label>
                          <p>or drag and drop</p>
                        </div>
                        <p className="text-sm text-muted-foreground/70">
                          Supported formats: PDF, PNG, JPG (max 10MB)
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 rounded-2xl border border-border/60 bg-background p-5 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center gap-5">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/10">
                          <FileText className="h-7 w-7 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-medium text-foreground truncate max-w-[220px] sm:max-w-sm">
                            {bankFile.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="px-2 py-0.5 text-xs font-normal bg-muted text-muted-foreground"
                            >
                              {(bankFile.size / 1024 / 1024).toFixed(2)} MB
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              • Ready to upload
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFile("bank")}
                        disabled={isUploading}
                        className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </Field>
              </FieldGroup>
            )}
          </CardContent>

          {!isSuccess && (
            <CardFooter className="flex items-center justify-between bg-muted/5 border-t border-border/40 px-8 py-5">
              <Button
                variant="ghost"
                onClick={() =>
                  router.push("/integrate-payment/methods/worldpay-onboarding")
                }
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!idFile || !bankFile || isUploading}
                size="lg"
                className="min-w-[160px] font-medium"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Submit Documents"
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
