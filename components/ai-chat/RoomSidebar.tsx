"use client";

import * as React from "react";
import { Video, Mic, Hash, Calendar, Users2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ROOMS = [
  { id: "1", name: "Architecture Sync", type: "Video", participants: 3, time: "Active Now" },
  { id: "2", name: "Daily Standup", type: "Audio", participants: 8, time: "Today, 10:00" },
  { id: "3", name: "Security Deep-Dive", type: "Public", participants: 12, time: "Yesterday" },
  { id: "4", name: "Frontend Alignment", type: "Private", participants: 2, time: "May 8" },
];

export function RoomSidebar() {
  return (
    <div className="w-full h-full flex flex-col bg-background/50 overflow-hidden">
      <div className="p-4 space-y-6">
        <Button 
          className="w-full justify-between bg-muted/40 hover:bg-muted/60 border-border/40 text-foreground rounded-xl h-11 px-4"
          variant="outline"
        >
          <div className="flex items-center gap-2">
            <Plus className="size-4" />
            <span className="font-medium text-[15px]">Create Room</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono opacity-50">Alt+N</span>
        </Button>

        <div className="flex items-center gap-2 px-1">
          <span className="text-sm font-medium text-muted-foreground">Active Rooms</span>
          <span className="px-2 py-0.5 rounded-md bg-muted/40 text-[11px] font-mono text-muted-foreground">4</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 custom-scrollbar">
        {ROOMS.map((room) => (
          <div 
            key={room.id}
            className="group px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="size-8 rounded-lg bg-muted/20 flex items-center justify-center shrink-0">
                {room.type === "Video" ? <Video className="size-4 text-primary" /> : 
                 room.type === "Audio" ? <Mic className="size-4 text-emerald-500" /> :
                 <Hash className="size-4 text-muted-foreground" />}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-[14px] font-medium text-foreground/90 truncate leading-tight">
                  {room.name}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users2 className="size-3" />
                    <span>{room.participants}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground/40">•</span>
                  <span className={cn(
                    "text-[11px]",
                    room.time === "Active Now" ? "text-emerald-500 font-medium" : "text-muted-foreground"
                  )}>{room.time}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
