"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DaySlot } from "@/lib/setup-business-store";
import { CopyIcon, RotateCcwIcon } from "lucide-react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface OperatingHoursProps {
  is24_7: boolean;
  selectedDays: string[];
  dailyTimeSlots: DaySlot[];
  onUpdate: (data: {
    is24_7?: boolean;
    selectedDays?: string[];
    dailyTimeSlots?: DaySlot[];
  }) => void;
  errors?: Record<string, string>;
}

export function OperatingHours({
  is24_7,
  selectedDays,
  dailyTimeSlots,
  onUpdate,
  errors = {},
}: OperatingHoursProps) {
  const handleToggle24_7 = (checked: boolean) => {
    if (checked) {
      onUpdate({
        is24_7: true,
        selectedDays: [...DAYS],
        dailyTimeSlots: DAYS.map((day) => ({
          day,
          openTime: "00:00",
          closeTime: "23:59",
        })),
      });
    } else {
      onUpdate({ is24_7: false });
    }
  };

  const handleDayToggle = (day: string, checked: boolean) => {
    if (is24_7) return;

    let newSelectedDays = [...selectedDays];
    let newSlots = [...dailyTimeSlots];

    if (checked) {
      if (!newSelectedDays.includes(day)) {
        newSelectedDays.push(day);
        newSlots.push({ day, openTime: "09:00", closeTime: "17:00" });
      }
    } else {
      newSelectedDays = newSelectedDays.filter((d) => d !== day);
      newSlots = newSlots.filter((s) => s.day !== day);
    }

    // Sort selected days and slots according to DAYS order
    newSelectedDays.sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
    newSlots.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));

    onUpdate({ selectedDays: newSelectedDays, dailyTimeSlots: newSlots });
  };

  const handleTimeChange = (
    day: string,
    field: "openTime" | "closeTime",
    value: string,
  ) => {
    const newSlots = dailyTimeSlots.map((slot) =>
      slot.day === day ? { ...slot, [field]: value } : slot,
    );
    onUpdate({ dailyTimeSlots: newSlots });
  };

  const copyToAll = () => {
    // Sort before copying to ensure we copy from the first calendar day
    const sortedSlots = [...dailyTimeSlots].sort(
      (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day),
    );

    if (sortedSlots.length === 0) return;

    const firstSlot = sortedSlots[0];
    const newSlots = dailyTimeSlots.map((slot) => ({
      ...slot,
      openTime: firstSlot.openTime,
      closeTime: firstSlot.closeTime,
    }));
    onUpdate({ dailyTimeSlots: newSlots });
  };

  const resetSlots = () => {
    // Reset based on selectedDays to ensure sync, even if dailyTimeSlots is somehow inconsistent
    const newSlots = selectedDays.map((day) => ({
      day,
      openTime: "09:00",
      closeTime: "17:00",
    }));
    onUpdate({ dailyTimeSlots: newSlots });
  };

  return (
    <FieldGroup className="gap-8">
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
        <Field orientation="horizontal" className="flex-1">
          <div className="flex-1">
            <FieldLabel
              id="toggle-24-7-label"
              className="text-sm font-medium m-0"
            >
              7 days / 24 hours open
            </FieldLabel>
            <FieldDescription className="text-xs text-muted-foreground m-0">
              Automatically select all days and set to full-day operation
            </FieldDescription>
          </div>
          <Switch
            checked={is24_7}
            onCheckedChange={handleToggle24_7}
            aria-labelledby="toggle-24-7-label"
          />
        </Field>
      </div>

      <FieldSet>
        <FieldLegend className="text-sm font-medium">
          Days of Operation
        </FieldLegend>
        <div className="flex flex-wrap gap-3 mt-4" role="group">
          {DAYS.map((day) => (
            <div
              key={day}
              className="flex items-center space-x-2 bg-background border rounded-full px-3 py-1.5 shadow-sm"
            >
              <Checkbox
                id={`day-${day}`}
                checked={selectedDays.includes(day)}
                onCheckedChange={(checked) =>
                  handleDayToggle(day, checked === true)
                }
                disabled={is24_7}
                aria-label={`Select ${day}`}
              />
              <label
                htmlFor={`day-${day}`}
                className="text-xs font-medium cursor-pointer select-none"
              >
                {day.substring(0, 3)}
              </label>
            </div>
          ))}
        </div>
        {errors.selectedDays && (
          <p className="text-xs text-destructive mt-2" role="alert">
            {errors.selectedDays}
          </p>
        )}
      </FieldSet>

      {!is24_7 && selectedDays.length > 0 && (
        <div className="space-y-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h4 id="daily-slots-label" className="text-sm font-medium">
              Daily Time Slots
            </h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToAll();
                }}
                className="h-8 text-xs relative z-10"
                aria-label="Copy first day's times to all other selected days"
              >
                <CopyIcon data-icon="inline-start" />
                Copy to all
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  resetSlots();
                }}
                className="h-8 text-xs relative z-10"
                aria-label="Reset all days to 9:00 AM - 5:00 PM"
              >
                <RotateCcwIcon data-icon="inline-start" />
                Reset
              </Button>
            </div>
          </div>

          <FieldGroup className="gap-4">
            {DAYS.filter((day) => selectedDays.includes(day)).map((day) => {
              const slot = dailyTimeSlots.find((s) => s.day === day);
              if (!slot) return null;

              return (
                <div
                  key={day}
                  className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 p-3 bg-muted/20 rounded-md border border-border/40 animate-in fade-in slide-in-from-left-2 duration-200"
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {day}
                  </span>
                  <div className="flex items-center gap-3 md:col-span-2">
                    <Field className="flex-1">
                      <Input
                        type="time"
                        value={slot.openTime ?? ""}
                        onChange={(e) =>
                          handleTimeChange(day, "openTime", e.target.value)
                        }
                        className="h-9 text-xs"
                        aria-label={`${day} opening time`}
                      />
                    </Field>
                    <span
                      className="text-muted-foreground text-xs font-medium"
                      aria-hidden="true"
                    >
                      to
                    </span>
                    <Field className="flex-1">
                      <Input
                        type="time"
                        value={slot.closeTime ?? ""}
                        onChange={(e) =>
                          handleTimeChange(day, "closeTime", e.target.value)
                        }
                        className="h-9 text-xs"
                        aria-label={`${day} closing time`}
                      />
                    </Field>
                  </div>
                  {errors[`${day}-time`] && (
                    <p
                      className="text-[10px] text-destructive md:col-start-2 md:col-span-2 -mt-2"
                      role="alert"
                    >
                      {errors[`${day}-time`]}
                    </p>
                  )}
                </div>
              );
            })}
          </FieldGroup>
        </div>
      )}
    </FieldGroup>
  );
}
