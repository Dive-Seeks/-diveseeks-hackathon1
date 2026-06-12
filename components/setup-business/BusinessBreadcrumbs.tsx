"use client";

import * as React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useSetupBusinessStore } from "@/lib/setup-business-store";
import { ChevronRight } from "lucide-react";

const steps = [
  { id: 1, name: "Basics" },
  { id: 2, name: "Owners" },
  { id: 3, name: "Bank" },
  { id: 4, name: "Site" },
];

export interface BusinessBreadcrumbsProps {
  title?: string;
  href?: string;
}

export function BusinessBreadcrumbs({
  title = "Setup Business",
  href = "/setup-business",
}: BusinessBreadcrumbsProps) {
  const { currentStep, setStep, status } = useSetupBusinessStore();

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbItem>
        <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator>
        <ChevronRight className="size-4" />
      </BreadcrumbSeparator>
      <BreadcrumbItem>
        <BreadcrumbLink href={href}>{title}</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator>
        <ChevronRight className="size-4" />
      </BreadcrumbSeparator>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <BreadcrumbItem>
            {currentStep === step.id ? (
              <BreadcrumbPage className="font-bold text-primary">
                {step.name}
              </BreadcrumbPage>
            ) : (
              <BreadcrumbLink
                className={`cursor-pointer ${step.id < currentStep ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50 pointer-events-none"}`}
                onClick={() => step.id < currentStep && setStep(step.id)}
              >
                {step.name}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {index < steps.length - 1 && (
            <BreadcrumbSeparator>
              <ChevronRight className="size-4" />
            </BreadcrumbSeparator>
          )}
        </React.Fragment>
      ))}
      {status && (
        <>
          <BreadcrumbSeparator>
            <ChevronRight className="size-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {status}
            </span>
          </BreadcrumbItem>
        </>
      )}
    </Breadcrumb>
  );
}
