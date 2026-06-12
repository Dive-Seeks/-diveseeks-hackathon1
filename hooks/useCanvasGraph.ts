import { Node, Edge } from '@xyflow/react';
import {
  CanvasGraphInput,
  CeoNodeData,
  CoordinatorNodeData,
  SpecialistNodeData,
  AddAgentNodeData,
} from '../lib/agent-canvas.types';

export const CEO_Y = 0;
export const SPOKE_OFFSET_Y = 130;
export const COORDINATOR_Y = 280;
export const SPECIALIST_ROW_Y_START = 500;
export const SPECIALIST_ROW_SPACING = 190;
export const SPECIALIST_COL_GAP = 210;
export const SPECIALISTS_PER_ROW = 5;

const SPOKE_KEYS = ['tasks', 'goals', 'prd', 'budget'] as const;

const SPOKE_X_OFFSETS: Record<string, number> = {
  tasks: -180,
  goals: -60,
  prd: 60,
  budget: 180,
};

function outcomeStroke(outcome: 'pass' | 'fail' | 'needs_review'): string {
  if (outcome === 'pass') return '#22C55E';
  if (outcome === 'fail') return '#EF4444';
  return '#F59E0B';
}

export function buildCanvasGraph(input: CanvasGraphInput): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const totalSlots = input.specialists.length + 1;
  const centerX = Math.max(
    (Math.min(totalSlots, SPECIALISTS_PER_ROW) * SPECIALIST_COL_GAP) / 2,
    400,
  );

  // CEO node
  nodes.push({
    id: 'node-ceo',
    type: 'ceoNode',
    position: { x: centerX - 100, y: CEO_Y },
    data: {
      coordinatorName: input.coordinatorName,
      spokeData: input.ceoData,
      speechBubble: input.ceoPlan,
    } as CeoNodeData,
  });

  // CEO spoke chips
  SPOKE_KEYS.forEach(key => {
    nodes.push({
      id: `node-spoke-${key}`,
      type: 'ceoSpokeNode',
      position: { x: centerX - 100 + SPOKE_X_OFFSETS[key], y: SPOKE_OFFSET_Y },
      data: { spokeKey: key, spokeData: input.ceoData },
    });
    edges.push({
      id: `edge-spoke-${key}`,
      source: 'node-ceo',
      target: `node-spoke-${key}`,
      style: { stroke: '#F59E0B', strokeWidth: 1.5, opacity: 0.6 },
      type: 'straight',
    });
  });

  // Coordinator node
  nodes.push({
    id: 'node-coordinator',
    type: 'coordinatorNode',
    position: { x: centerX - 100, y: COORDINATOR_Y },
    data: {
      name: input.coordinatorName,
      monogram: input.coordinatorMonogram,
      avatarPath: null,
      status: input.coordinatorStatus,
      currentTask: input.coordinatorCurrentTask,
      reading: input.workflowPhase === 'coordinator_reading',
    } as CoordinatorNodeData,
  });

  edges.push({
    id: 'edge-ceo-coordinator',
    source: 'node-ceo',
    target: 'node-coordinator',
    type: 'smoothstep',
    label: '⚡ cmd',
    labelStyle: { fontSize: 10, fill: '#f59e0b', opacity: 0.8 },
    style: {
      stroke: '#f59e0b',
      strokeWidth: 2.5,
      strokeDasharray: '12 6',
      animation: 'dashFlow 1.8s linear infinite',
      filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.6))',
    },
  });

  // Specialist nodes + edges
  const rows = Math.ceil(totalSlots / SPECIALISTS_PER_ROW);
  input.specialists.forEach((spec, i) => {
    const col = i % SPECIALISTS_PER_ROW;
    const row = Math.floor(i / SPECIALISTS_PER_ROW);
    const slotsInRow = row === rows - 1
      ? (totalSlots % SPECIALISTS_PER_ROW || SPECIALISTS_PER_ROW)
      : SPECIALISTS_PER_ROW;
    const rowWidth = slotsInRow * SPECIALIST_COL_GAP;
    const rowStartX = centerX - rowWidth / 2 + SPECIALIST_COL_GAP / 2;
    const x = rowStartX + col * SPECIALIST_COL_GAP;
    const y = SPECIALIST_ROW_Y_START + row * SPECIALIST_ROW_SPACING;

    const nodeId = `node-specialist-${spec.id}`;
    const status = input.specialistStatuses[spec.id] ?? 'idle';
    const reportOutcome = input.reportOutcomes[spec.id] ?? null;
    const currentTask = input.specialistCurrentTasks[spec.id];

    nodes.push({
      id: nodeId,
      type: 'specialistNode',
      position: { x, y },
      data: {
        entry: spec,
        status,
        reportOutcome,
        currentTask,
        agentResult: input.agentResults?.[spec.id],
      } as SpecialistNodeData,
    });

    const isRunning = status === 'running';
    edges.push({
      id: `edge-delegate-${spec.id}`,
      source: 'node-coordinator',
      target: nodeId,
      type: 'smoothstep',
      label: isRunning ? '→ task' : undefined,
      labelStyle: { fontSize: 9, fill: '#60a5fa', opacity: 0.9 },
      style: isRunning
        ? {
            stroke: '#60a5fa',
            strokeWidth: 2,
            strokeDasharray: '8 4',
            animation: 'dashFlow 1.2s linear infinite',
            filter: 'drop-shadow(0 0 3px rgba(96,165,250,0.5))',
          }
        : {
            stroke: '#3b82f6',
            strokeWidth: 1.5,
            opacity: 0.35,
          },
    });

    const hasOutcome = !!reportOutcome;
    const reportStroke = reportOutcome ? outcomeStroke(reportOutcome.outcome) : '#10b981';
    const reportFilter = hasOutcome
      ? `drop-shadow(0 0 3px ${reportStroke}80)`
      : undefined;
    edges.push({
      id: `edge-report-${spec.id}`,
      source: nodeId,
      target: 'node-coordinator',
      type: 'straight',
      label: hasOutcome ? '↑ report' : undefined,
      labelStyle: { fontSize: 9, fill: reportStroke, opacity: 0.9 },
      style: {
        stroke: reportStroke,
        strokeWidth: hasOutcome ? 1.8 : 1,
        strokeDasharray: '4 5',
        animation: 'dashFlow 0.7s linear infinite reverse',
        opacity: hasOutcome ? 0.85 : 0.4,
        filter: reportFilter,
      },
    });
  });

  // AddAgent node (last slot)
  const addIdx = input.specialists.length;
  const addRow = Math.floor(addIdx / SPECIALISTS_PER_ROW);
  const addCol = addIdx % SPECIALISTS_PER_ROW;
  const addSlotsInRow = totalSlots % SPECIALISTS_PER_ROW || SPECIALISTS_PER_ROW;
  const addRowWidth = addSlotsInRow * SPECIALIST_COL_GAP;
  const addStartX = centerX - addRowWidth / 2 + SPECIALIST_COL_GAP / 2;

  nodes.push({
    id: 'node-add-agent',
    type: 'addAgentNode',
    position: {
      x: addStartX + addCol * SPECIALIST_COL_GAP,
      y: SPECIALIST_ROW_Y_START + addRow * SPECIALIST_ROW_SPACING,
    },
    data: { onAddAgent: input.onAddAgent } satisfies AddAgentNodeData,
  });

  return { nodes, edges };
}
