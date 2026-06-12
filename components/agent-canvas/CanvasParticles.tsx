'use client';
import React from 'react';
import { useViewport } from '@xyflow/react';
import { SpecialistEntry, SpecialistStatus } from '../../lib/agent-canvas.types';
import {
  COORDINATOR_Y,
  SPECIALIST_ROW_Y_START,
  SPECIALIST_ROW_SPACING,
  SPECIALIST_COL_GAP,
  SPECIALISTS_PER_ROW,
} from '../../hooks/useCanvasGraph';

interface CanvasParticlesProps {
  specialists: SpecialistEntry[];
  specialistStatuses: Record<string, SpecialistStatus>;
}

function computeCenterX(totalSlots: number): number {
  return Math.max(
    (Math.min(totalSlots, SPECIALISTS_PER_ROW) * SPECIALIST_COL_GAP) / 2,
    400,
  );
}

export function CanvasParticles({ specialists, specialistStatuses }: CanvasParticlesProps) {
  const { x: vpX, y: vpY, zoom } = useViewport();
  const totalSlots = specialists.length + 1; // +1 for AddAgent slot
  const centerX = computeCenterX(totalSlots);

  // Coordinator bottom-center in graph space (node starts at centerX-100, is ~144px tall)
  const coordGX = centerX;
  const coordGY = COORDINATOR_Y + 72;

  const coordSX = coordGX * zoom + vpX;
  const coordSY = coordGY * zoom + vpY;

  const rows = Math.ceil(totalSlots / SPECIALISTS_PER_ROW);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      {specialists.map((spec, i) => {
        if (specialistStatuses[spec.id] !== 'running') return null;

        const col = i % SPECIALISTS_PER_ROW;
        const row = Math.floor(i / SPECIALISTS_PER_ROW);
        const slotsInRow =
          row === rows - 1
            ? totalSlots % SPECIALISTS_PER_ROW || SPECIALISTS_PER_ROW
            : SPECIALISTS_PER_ROW;
        const rowWidth = slotsInRow * SPECIALIST_COL_GAP;
        const rowStartX = centerX - rowWidth / 2 + SPECIALIST_COL_GAP / 2;

        // Specialist top-center in graph space (node is ~176px wide)
        const specGX = rowStartX + col * SPECIALIST_COL_GAP + 88;
        const specGY = SPECIALIST_ROW_Y_START + row * SPECIALIST_ROW_SPACING;

        const specSX = specGX * zoom + vpX;
        const specSY = specGY * zoom + vpY;

        const dx = specSX - coordSX;
        const dy = specSY - coordSY;
        const size = Math.max(4, Math.round(7 * zoom));

        return (
          <div
            key={spec.id}
            style={
              {
                position: 'absolute',
                left: coordSX - size / 2,
                top: coordSY - size / 2,
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #93c5fd, #3b82f6)',
                boxShadow: '0 0 8px #3b82f6',
                '--dx': `${dx}px`,
                '--dy': `${dy}px`,
                animation: 'particleMove 1.5s linear infinite',
                animationDelay: `${(i % 5) * 0.3}s`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
