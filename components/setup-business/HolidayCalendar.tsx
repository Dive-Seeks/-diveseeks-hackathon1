"use client";

import * as React from "react";
import { Holiday } from "@/lib/setup-business-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PlusIcon,
  TrashIcon,
  CalendarIcon,
  ClockIcon,
  GripVerticalIcon,
} from "lucide-react";
import { format } from "date-fns";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface HolidayCalendarProps {
  holidays: Holiday[];
  onUpdate: (holidays: Holiday[]) => void;
  errors?: Record<string, string>;
}

function SortableHolidayItem({
  holiday,
  index,
  errors,
  updateHoliday,
  removeHoliday,
}: {
  holiday: Holiday;
  index: number;
  errors: Record<string, string>;
  updateHoliday: (id: string, updates: Partial<Holiday>) => void;
  removeHoliday: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: holiday.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 bg-background border rounded-lg shadow-sm space-y-4 ${isDragging ? "opacity-50 border-primary ring-2 ring-primary/20" : "animate-in fade-in slide-in-from-top-2 duration-200"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1"
            aria-label={`Drag to reorder ${holiday.name || "this holiday"}`}
            {...attributes}
            {...listeners}
          >
            <GripVerticalIcon className="size-4" />
          </button>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor={`holiday-${holiday.id}-name`}
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                Holiday Name
              </label>
              <Input
                id={`holiday-${holiday.id}-name`}
                value={holiday.name ?? ""}
                onChange={(e) =>
                  updateHoliday(holiday.id, { name: e.target.value })
                }
                placeholder="e.g. Christmas Day"
                className="h-9 text-xs"
                maxLength={100}
              />
              {errors[`holiday-${index}-name`] && (
                <p className="text-[10px] text-destructive" role="alert">
                  {errors[`holiday-${index}-name`]}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`holiday-${holiday.id}-date`}
                className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                Date
              </label>
              <Input
                id={`holiday-${holiday.id}-date`}
                type="date"
                value={holiday.date ?? ""}
                onChange={(e) =>
                  updateHoliday(holiday.id, { date: e.target.value })
                }
                className="h-9 text-xs"
              />
              {errors[`holiday-${index}-date`] && (
                <p className="text-[10px] text-destructive" role="alert">
                  {errors[`holiday-${index}-date`]}
                </p>
              )}
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => removeHoliday(holiday.id)}
          className="size-8 text-destructive hover:bg-destructive/10 shrink-0"
          aria-label={`Remove ${holiday.name || "this holiday"}`}
        >
          <TrashIcon className="size-3.5" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-6 pt-3 border-t ml-7">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`closed-${holiday.id}`}
            checked={holiday.isClosed}
            onCheckedChange={(checked) =>
              updateHoliday(holiday.id, { isClosed: checked === true })
            }
          />
          <label
            htmlFor={`closed-${holiday.id}`}
            className="text-xs font-medium cursor-pointer"
          >
            Closed all day
          </label>
        </div>

        {!holiday.isClosed && (
          <div className="flex items-center gap-3 animate-in zoom-in-95 duration-200">
            <ClockIcon
              className="size-3 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="time"
              value={holiday.openTime ?? ""}
              onChange={(e) =>
                updateHoliday(holiday.id, { openTime: e.target.value })
              }
              className="h-8 w-24 text-[11px] px-2"
              aria-label={`${holiday.name || "Holiday"} opening time`}
            />
            <span
              className="text-[11px] text-muted-foreground"
              aria-hidden="true"
            >
              to
            </span>
            <Input
              type="time"
              value={holiday.closeTime ?? ""}
              onChange={(e) =>
                updateHoliday(holiday.id, { closeTime: e.target.value })
              }
              className="h-8 w-24 text-[11px] px-2"
              aria-label={`${holiday.name || "Holiday"} closing time`}
            />
            {errors[`holiday-${index}-time`] && (
              <p className="text-[10px] text-destructive ml-2">
                {errors[`holiday-${index}-time`]}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function HolidayCalendar({
  holidays,
  onUpdate,
  errors = {},
}: HolidayCalendarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const addHoliday = () => {
    const newHoliday: Holiday = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      date: format(new Date(), "yyyy-MM-dd"),
      isClosed: false,
      openTime: "09:00",
      closeTime: "17:00",
    };
    onUpdate([...holidays, newHoliday]);
  };

  const updateHoliday = (id: string, updates: Partial<Holiday>) => {
    const newHolidays = holidays.map((h) =>
      h.id === id ? { ...h, ...updates } : h,
    );
    onUpdate(newHolidays);
  };

  const removeHoliday = (id: string) => {
    onUpdate(holidays.filter((h) => h.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = holidays.findIndex((h) => h.id === active.id);
      const newIndex = holidays.findIndex((h) => h.id === over.id);
      onUpdate(arrayMove(holidays, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Holiday Exceptions</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addHoliday}
          className="h-8 text-xs font-medium"
        >
          <PlusIcon className="size-3 mr-1.5" />
          Add Holiday
        </Button>
      </div>

      <div className="space-y-4">
        {holidays.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-muted/20 border border-dashed rounded-lg">
            <CalendarIcon className="size-6 text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">
              No holidays added yet
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={holidays.map((h) => h.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {holidays.map((holiday, index) => (
                  <SortableHolidayItem
                    key={holiday.id}
                    holiday={holiday}
                    index={index}
                    errors={errors}
                    updateHoliday={updateHoliday}
                    removeHoliday={removeHoliday}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        {errors.holidays && (
          <p className="text-xs text-destructive text-center" role="alert">
            {errors.holidays}
          </p>
        )}
      </div>
    </div>
  );
}
