'use client';
// @ts-ignore
import '@xyflow/react/dist/style.css';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from '@xyflow/react';
import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { CeoNode, CeoSpokeNode } from './nodes/CeoNode';
import { CoordinatorNode } from './nodes/CoordinatorNode';
import { SpecialistNode } from './nodes/SpecialistNode';
import { AddAgentNode } from './nodes/AddAgentNode';
import {
  BrainCoreNode,
  BrainRegionNode,
  BrainDetailNode,
  FinalReportNode,
  type BrainCoreNodeData,
  type BrainRegionNodeData,
  type BrainDetailNodeData,
  type FinalReportNodeData,
} from './nodes/BrainClusterNodes';
import { CanvasParticles } from './CanvasParticles';
import type { CanvasLiveData } from '../../hooks/useCanvasLiveData';
import { useCanvasStore } from '../../lib/canvas-live-store';
import {
  buildCanvasGraph,
  COORDINATOR_Y,
  SPECIALIST_COL_GAP,
  SPECIALIST_ROW_SPACING,
  SPECIALIST_ROW_Y_START,
  SPECIALISTS_PER_ROW,
} from '../../hooks/useCanvasGraph';

const NODE_TYPES = {
  ceoNode: CeoNode,
  ceoSpokeNode: CeoSpokeNode,
  coordinatorNode: CoordinatorNode,
  specialistNode: SpecialistNode,
  brainCoreNode: BrainCoreNode,
  brainRegionNode: BrainRegionNode,
  brainDetailNode: BrainDetailNode,
  reportNode: FinalReportNode,
  addAgentNode: AddAgentNode,
};

type BrainRegionId =
  | 'thalamus'
  | 'broca-wernicke'
  | 'amygdala'
  | 'hippocampus'
  | 'neocortex'
  | 'basal-ganglia'
  | 'prefrontal-cortex';

interface MemoryEpisode {
  id: string;
  ownerType: string;
  ownerId: string;
  domain: string;
  episodeType: string;
  keywords: string[];
  summary: string;
  emotionTag?: string | null;
  saliencePriority?: 'high' | 'normal' | 'low' | null;
  createdAt: string;
}

interface TenantBrain {
  generatedAt: string;
  sessionCount: number;
  preferences?: string[];
  domainKnowledge?: Array<{
    domain: string;
    knownPatterns: string[];
    warningFlags: string[];
    lastUpdated: string;
  }>;
  whatWorked?: string[];
  whatFailed?: string[];
  openQuestions?: string[];
}

interface WorkflowTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  specialist?: string;
  goalTitle?: string;
}

interface EvolutionEvent {
  id: string;
  domain: string;
  created_at: string;
}

interface BrainMemoryItem {
  id: string;
  title: string;
  detail: string;
  meta?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}

interface BrainRegionDefinition {
  id: BrainRegionId;
  name: string;
  description: string;
  detail: string;
  accentClass: string;
  borderClass: string;
  edgeColor: string;
}

interface BrainDataState {
  isLoading: boolean;
  tenantBrain: TenantBrain | null;
  episodes: MemoryEpisode[];
  tasks: WorkflowTask[];
  workflowStatus: string | null;
  evolutionEvents: EvolutionEvent[];
}

const BRAIN_REGIONS: BrainRegionDefinition[] = [
  {
    id: 'thalamus',
    name: 'Thalamus',
    description: 'Routes and validates project signals.',
    detail:
      'Routes the workflow into the right lane, validates that the run still has meaningful work, and keeps intake signals coherent.',
    accentClass: 'bg-sky-500/10 text-sky-200',
    borderClass: 'border-sky-400/50',
    edgeColor: '#38bdf8',
  },
  {
    id: 'broca-wernicke',
    name: 'Broca-Wernicke',
    description: 'Turns language into structured understanding.',
    detail:
      'Interprets goals, constraints, and natural-language project context so Abigail can turn human requests into structured execution.',
    accentClass: 'bg-indigo-500/10 text-indigo-200',
    borderClass: 'border-indigo-400/50',
    edgeColor: '#818cf8',
  },
  {
    id: 'amygdala',
    name: 'Amygdala',
    description: 'Detects importance, risk, failure, and urgency.',
    detail:
      'Surfaces blocked tasks, review-required work, and urgent workflow issues so the team can react before the run collapses silently.',
    accentClass: 'bg-rose-500/10 text-rose-200',
    borderClass: 'border-rose-400/50',
    edgeColor: '#fb7185',
  },
  {
    id: 'hippocampus',
    name: 'Hippocampus',
    description: 'Stores project episodes and memories.',
    detail:
      'Captures project episodes, decisions, corrections, and reusable context so future runs can learn from prior work.',
    accentClass: 'bg-emerald-500/10 text-emerald-200',
    borderClass: 'border-emerald-400/50',
    edgeColor: '#34d399',
  },
  {
    id: 'neocortex',
    name: 'Neocortex',
    description: 'Compresses repeated experience into knowledge.',
    detail:
      'Turns repeated outcomes into durable knowledge, patterns, and warnings that stay readable to humans.',
    accentClass: 'bg-violet-500/10 text-violet-200',
    borderClass: 'border-violet-400/50',
    edgeColor: '#a78bfa',
  },
  {
    id: 'basal-ganglia',
    name: 'Basal Ganglia',
    description: 'Learns habits and improves behaviour through evolution.',
    detail:
      'Tracks repeated behavior and evolve signals so specialist habits can improve over time instead of repeating the same misses.',
    accentClass: 'bg-amber-500/10 text-amber-200',
    borderClass: 'border-amber-400/50',
    edgeColor: '#fbbf24',
  },
  {
    id: 'prefrontal-cortex',
    name: 'Prefrontal Cortex',
    description: 'Supports planning, coordination, and decisions.',
    detail:
      'Holds the planning layer: coordinator focus, workflow state, and the next decisions Abigail is making for this project.',
    accentClass: 'bg-cyan-500/10 text-cyan-200',
    borderClass: 'border-cyan-400/50',
    edgeColor: '#22d3ee',
  },
];

const EMPTY_BRAIN_DATA: BrainDataState = {
  isLoading: true,
  tenantBrain: null,
  episodes: [],
  tasks: [],
  workflowStatus: null,
  evolutionEvents: [],
};

export function AgentCanvas({
  data,
  projectId,
  projectName,
}: {
  data: CanvasLiveData;
  projectId?: string;
  projectName?: string;
}) {
  const liveData = data;
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [brainData, setBrainData] = useState<BrainDataState>(EMPTY_BRAIN_DATA);
  const [selectedRegion, setSelectedRegion] = useState<BrainRegionId>('hippocampus');
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);

  const reportReady = useCanvasStore((s) =>
    projectId ? (s.byProject[projectId]?.reportReady ?? false) : false,
  );
  const reportId = useCanvasStore((s) =>
    projectId ? s.byProject[projectId]?.reportId : undefined,
  );

  useEffect(() => {
    if (!reportReady || !reportId) {
      setReportMarkdown(null);
      return;
    }
    let cancelled = false;
    api
      .get(`/abigail/report-clipboard/${reportId}`)
      .then((res: any) => {
        if (cancelled) return;
        // Controller returns { data: {...} }, TransformInterceptor wraps again.
        const d = res.data?.data?.data ?? res.data?.data ?? res.data;
        if (d?.markdown) setReportMarkdown(d.markdown);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [reportReady, reportId]);

  useEffect(() => {
    if (!projectId) {
      setBrainData({
        ...EMPTY_BRAIN_DATA,
        isLoading: false,
      });
      return;
    }

    let cancelled = false;

    async function loadBrainData() {
      setBrainData((prev) => ({ ...prev, isLoading: true }));
      try {
        const [brainRes, episodesRes, tasksRes, runStateRes, evolveRes] =
          await Promise.allSettled([
            api.get('/memory/brain'),
            api.get('/memory/episodes', { params: { limit: 100 } }),
            api.get(`/diveseeks/projects/${projectId}/tasks-with-goals`),
            api.get(`/abigail/run-state/${projectId}`),
            api.get('/abigail/evolution-events', {
              params: { domain: liveData.team, limit: 20, page: 1 },
            }),
          ]);

        if (cancelled) return;

        const tenantBrain =
          brainRes.status === 'fulfilled'
            ? ((brainRes.value.data?.data ?? brainRes.value.data) as
                | TenantBrain
                | { empty?: boolean })
            : null;
        const episodes =
          episodesRes.status === 'fulfilled'
            ? (((episodesRes.value.data?.data?.data ??
                episodesRes.value.data?.data ??
                []) as MemoryEpisode[]) ?? [])
            : [];
        const goals =
          tasksRes.status === 'fulfilled'
            ? ((tasksRes.value.data?.data?.goals ??
                tasksRes.value.data?.goals ??
                []) as Array<{
                tasks?: Array<{
                  id: string;
                  title: string;
                  description?: string;
                  status: string;
                  specialist?: string;
                }>;
                title?: string;
              }>)
            : [];
        const workflowTasks = goals.flatMap((goal) =>
          (goal.tasks ?? []).map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            specialist: task.specialist,
            goalTitle: goal.title,
          })),
        );
        const workflowStatus =
          runStateRes.status === 'fulfilled'
            ? ((runStateRes.value.data?.data?.status ??
                runStateRes.value.data?.status ??
                null) as string | null)
            : null;
        const evolutionEvents =
          evolveRes.status === 'fulfilled'
            ? (((evolveRes.value.data?.data?.data ??
                evolveRes.value.data?.data ??
                []) as EvolutionEvent[]) ?? [])
            : [];

        setBrainData({
          isLoading: false,
          tenantBrain:
            tenantBrain && 'empty' in tenantBrain && tenantBrain.empty
              ? null
              : (tenantBrain as TenantBrain | null),
          episodes,
          tasks: workflowTasks,
          workflowStatus,
          evolutionEvents,
        });
      } catch {
        if (cancelled) return;
        setBrainData({
          ...EMPTY_BRAIN_DATA,
          isLoading: false,
        });
      }
    }

    loadBrainData();
    return () => {
      cancelled = true;
    };
  }, [projectId, projectName, liveData.team]);

  const projectRelatedEpisodes = useMemo(() => {
    const filtered = filterProjectEpisodes(brainData.episodes, projectId, projectName);
    // Fall back to the latest tenant episodes so the brain never looks empty
    // when memory exists but isn't project-tagged.
    return filtered.length > 0 ? filtered : brainData.episodes.slice(0, 8);
  }, [brainData.episodes, projectId, projectName]);

  const itemsByRegion = useMemo(
    () =>
      Object.fromEntries(
        BRAIN_REGIONS.map((region) => [
          region.id,
          buildRegionItems({
            workflowStatus: brainData.workflowStatus,
            tenantBrain: brainData.tenantBrain,
            episodes: projectRelatedEpisodes,
            tasks: brainData.tasks,
            evolutionEvents: brainData.evolutionEvents,
            liveData,
            regionId: region.id,
          }),
        ]),
      ) as Record<BrainRegionId, BrainMemoryItem[]>,
    [
      brainData.workflowStatus,
      brainData.tenantBrain,
      projectRelatedEpisodes,
      brainData.tasks,
      brainData.evolutionEvents,
      liveData,
    ],
  );

  useEffect(() => {
    const { nodes: nextNodes, edges: nextEdges } = buildCanvasGraph(liveData);
    const totalSlots = liveData.specialists.length + 1;
    const centerX = Math.max(
      (Math.min(totalSlots, SPECIALISTS_PER_ROW) * SPECIALIST_COL_GAP) / 2,
      400,
    );
    const lastRow = Math.floor((totalSlots - 1) / SPECIALISTS_PER_ROW);

    // --- Live brain cluster: core + region nodes + detail panel ---
    const coreX = centerX - 120;
    const coreY = SPECIALIST_ROW_Y_START + lastRow * SPECIALIST_ROW_SPACING + 300;
    const totalItems = BRAIN_REGIONS.reduce(
      (sum, region) => sum + (itemsByRegion[region.id]?.length ?? 0),
      0,
    );

    nextNodes.push({
      id: 'node-abigail-brain',
      type: 'brainCoreNode',
      position: { x: coreX, y: coreY },
      draggable: false,
      data: {
        projectName,
        isLoading: brainData.isLoading,
        totalItems,
        active: totalItems > 0,
      } satisfies BrainCoreNodeData,
    });

    nextEdges.push({
      id: 'edge-coordinator-brain',
      source: 'node-coordinator',
      target: 'node-abigail-brain',
      type: 'smoothstep',
      label: 'memory',
      labelStyle: { fontSize: 10, fill: '#7dd3fc', opacity: 0.9 },
      style: {
        stroke: '#38bdf8',
        strokeWidth: 1.75,
        strokeDasharray: '10 6',
        animation: 'dashFlow 1.6s linear infinite',
        opacity: 0.7,
      },
    });

    BRAIN_REGIONS.forEach((region, i) => {
      const column = i < 3 ? 'left' : i < 6 ? 'right' : 'bottom';
      const rowIdx = i % 3;
      const position =
        column === 'left'
          ? { x: coreX - 320, y: coreY - 30 + rowIdx * 110 }
          : column === 'right'
            ? { x: coreX + 360, y: coreY - 30 + rowIdx * 110 }
            : { x: coreX + 20, y: coreY + 330 };
      const handleSide =
        column === 'left' ? 'right' : column === 'right' ? 'left' : 'top';
      const isSelected = region.id === selectedRegion;
      const itemCount = itemsByRegion[region.id]?.length ?? 0;

      nextNodes.push({
        id: `node-brain-${region.id}`,
        type: 'brainRegionNode',
        position,
        draggable: false,
        data: {
          region,
          itemCount,
          isSelected,
          handleSide,
          onSelect: (regionId: string) => setSelectedRegion(regionId as BrainRegionId),
        } satisfies BrainRegionNodeData,
      });

      nextEdges.push({
        id: `edge-brain-${region.id}`,
        source: 'node-abigail-brain',
        sourceHandle: column === 'left' ? 'l' : column === 'right' ? 'r' : 'b',
        target: `node-brain-${region.id}`,
        type: 'default',
        animated: itemCount > 0,
        style: {
          stroke: region.edgeColor,
          strokeWidth: isSelected ? 2.5 : 1.5,
          opacity: isSelected ? 0.95 : itemCount > 0 ? 0.65 : 0.3,
          filter: isSelected ? `drop-shadow(0 0 4px ${region.edgeColor}80)` : undefined,
        },
      });
    });

    const activeRegion =
      BRAIN_REGIONS.find((region) => region.id === selectedRegion) ?? BRAIN_REGIONS[0];
    nextNodes.push({
      id: 'node-brain-detail',
      type: 'brainDetailNode',
      position: { x: coreX + 680, y: coreY - 40 },
      draggable: false,
      data: {
        region: activeRegion,
        items: itemsByRegion[activeRegion.id] ?? [],
        isLoading: brainData.isLoading,
      } satisfies BrainDetailNodeData,
    });
    nextEdges.push({
      id: 'edge-brain-detail',
      source: 'node-abigail-brain',
      sourceHandle: 'r',
      target: 'node-brain-detail',
      type: 'default',
      animated: true,
      label: activeRegion.name,
      labelStyle: { fontSize: 10, fill: activeRegion.edgeColor, opacity: 0.9 },
      style: { stroke: activeRegion.edgeColor, strokeWidth: 2, opacity: 0.8 },
    });

    // --- Final report node: visible on the canvas once compiled ---
    if (reportMarkdown) {
      nextNodes.push({
        id: 'node-final-report',
        type: 'reportNode',
        position: { x: centerX + 560, y: COORDINATOR_Y - 60 },
        draggable: false,
        data: {
          markdown: reportMarkdown,
          generatedLabel: projectName ? `Compiled for ${projectName}` : undefined,
        } satisfies FinalReportNodeData,
      });
      nextEdges.push({
        id: 'edge-coordinator-report',
        source: 'node-coordinator',
        target: 'node-final-report',
        type: 'smoothstep',
        animated: true,
        label: 'final report',
        labelStyle: { fontSize: 10, fill: '#34d399', opacity: 0.9 },
        style: {
          stroke: '#34d399',
          strokeWidth: 2,
          opacity: 0.85,
          filter: 'drop-shadow(0 0 4px rgba(52,211,153,0.5))',
        },
      });
    }

    setNodes(nextNodes);
    setEdges(nextEdges);
  }, [
    itemsByRegion,
    brainData.isLoading,
    selectedRegion,
    reportMarkdown,
    projectName,
    liveData,
    setEdges,
    setNodes,
  ]);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background">
      <div className="relative min-h-[72vh] flex-1 overflow-hidden bg-background">
        <ReactFlow
          key={`${liveData.team}-${liveData.specialists.length}-${liveData.workflowPhase ?? 'idle'}`}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls position="bottom-right" showInteractive={false} />
          <CanvasParticles
            specialists={liveData.specialists}
            specialistStatuses={liveData.specialistStatuses}
          />
        </ReactFlow>
      </div>
    </div>
  );
}

function filterProjectEpisodes(
  episodes: MemoryEpisode[],
  projectId?: string,
  projectName?: string,
): MemoryEpisode[] {
  if (!projectId) return [];
  const projectNeedle = projectId.toLowerCase();
  const nameNeedle = projectName?.trim().toLowerCase() ?? '';
  return episodes.filter((episode) => {
    const haystack = `${episode.ownerId} ${episode.summary} ${episode.keywords.join(' ')}`.toLowerCase();
    if (episode.ownerId === projectId) return true;
    if (haystack.includes(projectNeedle)) return true;
    return nameNeedle.length > 3 ? haystack.includes(nameNeedle) : false;
  });
}

// Tenant-brain fields may be plain strings or synthesis objects
// ({pattern, successCount, ...}) depending on synthesiser version — never
// render them raw.
function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const candidate = v.pattern ?? v.text ?? v.summary ?? v.question ?? v.description;
    if (typeof candidate === 'string') return candidate;
    return JSON.stringify(value);
  }
  return String(value ?? '');
}

function buildRegionItems(params: {
  regionId: BrainRegionId;
  workflowStatus: string | null;
  tenantBrain: TenantBrain | null;
  episodes: MemoryEpisode[];
  tasks: WorkflowTask[];
  evolutionEvents: EvolutionEvent[];
  liveData: CanvasLiveData;
}): BrainMemoryItem[] {
  const {
    regionId,
    workflowStatus,
    tenantBrain,
    episodes,
    tasks,
    evolutionEvents,
    liveData,
  } = params;

  switch (regionId) {
    case 'hippocampus':
      return episodes.slice(0, 5).map((episode) => ({
        id: episode.id,
        title: episode.summary,
        detail: episode.keywords.slice(0, 4).join(' · ') || 'Episode memory',
        meta: formatDate(episode.createdAt),
        tone: episode.emotionTag === 'fear' ? 'danger' : 'neutral',
      }));

    case 'neocortex': {
      const domainKnowledge = tenantBrain?.domainKnowledge ?? [];
      const patterns = domainKnowledge.flatMap((domain) =>
        (domain.knownPatterns ?? []).slice(0, 2).map((pattern, index) => ({
          id: `${domain.domain}-${index}`,
          title: domain.domain,
          detail: asText(pattern),
          meta: 'Knowledge',
          tone: 'success' as const,
        })),
      );
      const worked = (tenantBrain?.whatWorked ?? []).slice(0, 2).map((item, index) => ({
        id: `worked-${index}`,
        title: 'What worked',
        detail: asText(item),
        meta: 'Pattern',
        tone: 'success' as const,
      }));
      return [...patterns, ...worked].slice(0, 5);
    }

    case 'basal-ganglia':
      return evolutionEvents.slice(0, 5).map((event, index) => ({
        id: event.id,
        title: `Evolution cycle ${index + 1}`,
        detail: `Domain: ${event.domain}`,
        meta: formatDate(event.created_at),
        tone: 'warning',
      }));

    case 'amygdala':
      return tasks
        .filter((task) =>
          ['blocked', 'needs_review', 'in_progress'].includes(task.status),
        )
        .slice(0, 5)
        .map((task) => ({
          id: task.id,
          title: task.title,
          detail:
            task.description || task.goalTitle || 'Task requires attention.',
          meta: task.status.replace(/_/g, ' '),
          tone:
            task.status === 'blocked'
              ? 'danger'
              : task.status === 'needs_review'
                ? 'warning'
                : 'neutral',
        }));

    case 'prefrontal-cortex': {
      const items: BrainMemoryItem[] = [];
      if (workflowStatus) {
        items.push({
          id: 'workflow-status',
          title: 'Workflow state',
          detail: `Current run state is ${workflowStatus.replace(/_/g, ' ')}.`,
          meta: 'Coordinator',
        });
      }
      if (liveData.coordinatorCurrentTask) {
        items.push({
          id: 'coordinator-task',
          title: 'Current coordination focus',
          detail: liveData.coordinatorCurrentTask,
          meta: liveData.workflowPhase || 'Active',
        });
      }
      const plannedTasks = tasks
        .filter((task) => ['queued', 'in_progress', 'done'].includes(task.status))
        .slice(0, 3)
        .map((task) => ({
          id: `plan-${task.id}`,
          title: task.title,
          detail: task.goalTitle
            ? `Goal: ${task.goalTitle}`
            : task.description || 'Task linked to current plan.',
          meta: task.status.replace(/_/g, ' '),
          tone: task.status === 'done' ? ('success' as const) : ('neutral' as const),
        }));
      return [...items, ...plannedTasks].slice(0, 5);
    }

    case 'thalamus': {
      const items: BrainMemoryItem[] = [];
      if (liveData.workflowPhase) {
        items.push({
          id: 'workflow-phase',
          title: 'Workflow routing',
          detail: `Run is currently in ${liveData.workflowPhase.replace(/_/g, ' ')}.`,
          meta: 'Signal',
        });
      }
      items.push({
        id: 'task-routing',
        title: 'Task distribution',
        detail: `${liveData.ceoData.tasksQueued} queued, ${liveData.ceoData.tasksRunning} running, ${liveData.ceoData.tasksDone} done.`,
        meta: 'Validation',
      });
      if (liveData.ceoPlan) {
        items.push({
          id: 'ceo-plan',
          title: 'Intake plan',
          detail: liveData.ceoPlan,
          meta: 'CEO',
        });
      }
      return items.slice(0, 5);
    }

    case 'broca-wernicke': {
      const preferenceItems = (tenantBrain?.preferences ?? [])
        .slice(0, 3)
        .map((item, index) => ({
          id: `pref-${index}`,
          title: 'Language preference',
          detail: asText(item),
          meta: 'Preference',
        }));
      const openQuestions = (tenantBrain?.openQuestions ?? [])
        .slice(0, 2)
        .map((item, index) => ({
          id: `question-${index}`,
          title: 'Open interpretation',
          detail: asText(item),
          meta: 'Question',
          tone: 'warning' as const,
        }));
      return [...preferenceItems, ...openQuestions].slice(0, 5);
    }

    default:
      return [];
  }
}

function formatDate(value?: string) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return '';
  }
}
