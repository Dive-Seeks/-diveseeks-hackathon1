'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface RoutingActionsProps {
  routing: 'complex' | 'specialist';
  specialistName?: string;
  specialistRoute?: string;
}

export function RoutingActions({ routing, specialistName, specialistRoute }: RoutingActionsProps) {
  const router = useRouter();
  const name = specialistName ?? 'Specialist';

  if (routing === 'specialist') {
    return (
      <div className="flex items-center gap-2 mt-3">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => specialistRoute && router.push(specialistRoute)}
        >
          Open {name} Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-3">
      <Button size="sm" className="h-7 text-xs">
        Coordinate for me
      </Button>
      {specialistRoute && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => router.push(specialistRoute)}
        >
          Talk to {name}
        </Button>
      )}
    </div>
  );
}
