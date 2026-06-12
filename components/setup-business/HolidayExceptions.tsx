"use client";

import * as React from "react";
import { HolidayException } from "@/lib/setup-business-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrashIcon, PlusIcon, CalendarIcon } from "lucide-react";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyDescription,
} from "@/components/ui/empty";

interface HolidayExceptionsProps {
  exceptions: HolidayException[];
  onUpdate: (exceptions: HolidayException[]) => void;
  errors?: Record<string, string>;
}

export function HolidayExceptions({
  exceptions,
  onUpdate,
  errors = {},
}: HolidayExceptionsProps) {
  const addException = () => {
    const newException: HolidayException = {
      id: crypto.randomUUID(),
      name: "",
      startDate: "",
      endDate: "",
    };
    onUpdate([...exceptions, newException]);
  };

  const removeException = (id: string) => {
    onUpdate(exceptions.filter((e) => e.id !== id));
  };

  const updateException = (id: string, updates: Partial<HolidayException>) => {
    onUpdate(exceptions.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  return (
    <div className="space-y-4 pt-6 border-t animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <CalendarIcon className="size-4 text-primary" />
            Holiday Exceptions
          </h4>
          <p className="text-xs text-muted-foreground">
            Define date ranges when the site will be completely closed.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addException}
          className="h-8 gap-1.5"
          aria-label="Add holiday exception range"
        >
          <PlusIcon data-icon="inline-start" />
          Add Exception
        </Button>
      </div>

      {exceptions.length === 0 ? (
        <Empty className="py-8 bg-muted/20 border-2">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarIcon />
            </EmptyMedia>
            <EmptyDescription className="text-xs">
              No holiday exceptions defined.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div
          className="space-y-3"
          role="list"
          aria-label="Holiday exception ranges"
        >
          {exceptions.map((exception, index) => {
            const nameError = errors[`exception-${index}-name`];
            const rangeError = errors[`exception-${index}-range`];
            const startError = errors[`exception-${index}-start`];
            const endError = errors[`exception-${index}-end`];

            return (
              <div
                key={exception.id}
                className="group relative flex flex-col md:flex-row items-start md:items-center gap-4 p-4 bg-background border rounded-xl shadow-sm hover:border-primary/30 transition-all animate-in zoom-in-95 duration-200"
                role="listitem"
              >
                <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
                  <Field data-invalid={!!nameError}>
                    <FieldLabel
                      htmlFor={`exception-${exception.id}-name`}
                      className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Holiday Name
                    </FieldLabel>
                    <Input
                      id={`exception-${exception.id}-name`}
                      placeholder="e.g. Christmas"
                      value={exception.name ?? ""}
                      onChange={(e) =>
                        updateException(exception.id, { name: e.target.value })
                      }
                      className="h-9 text-xs"
                      aria-invalid={!!nameError}
                    />
                    {nameError && (
                      <FieldError
                        errors={[{ message: nameError }]}
                        className="text-[10px]"
                      />
                    )}
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field data-invalid={!!startError || !!rangeError}>
                      <FieldLabel
                        htmlFor={`exception-${exception.id}-start`}
                        className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        Start Date
                      </FieldLabel>
                      <Input
                        id={`exception-${exception.id}-start`}
                        type="date"
                        value={exception.startDate ?? ""}
                        onChange={(e) =>
                          updateException(exception.id, {
                            startDate: e.target.value,
                          })
                        }
                        className="h-9 text-xs"
                        aria-invalid={!!startError || !!rangeError}
                      />
                      {startError && (
                        <FieldError
                          errors={[{ message: startError }]}
                          className="text-[10px]"
                        />
                      )}
                    </Field>

                    <Field data-invalid={!!endError || !!rangeError}>
                      <FieldLabel
                        htmlFor={`exception-${exception.id}-end`}
                        className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        End Date
                      </FieldLabel>
                      <Input
                        id={`exception-${exception.id}-end`}
                        type="date"
                        value={exception.endDate ?? ""}
                        onChange={(e) =>
                          updateException(exception.id, {
                            endDate: e.target.value,
                          })
                        }
                        className="h-9 text-xs"
                        aria-invalid={!!endError || !!rangeError}
                      />
                      {endError && (
                        <FieldError
                          errors={[{ message: endError }]}
                          className="text-[10px]"
                        />
                      )}
                    </Field>
                  </div>
                </FieldGroup>

                <div className="flex items-center self-end md:self-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeException(exception.id)}
                    className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    aria-label="Remove this exception"
                  >
                    <TrashIcon />
                  </Button>
                </div>

                {rangeError && (
                  <p
                    className="absolute -bottom-5 left-4 text-[10px] text-destructive font-medium"
                    role="alert"
                    data-testid={`exception-${index}-range-error`}
                  >
                    {rangeError}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
