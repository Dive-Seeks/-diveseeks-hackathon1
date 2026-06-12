'use client';
// @ts-ignore
import '@xyflow/react/dist/style.css';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  type NodeProps,
  type Node,
  type Edge,
} from '@xyflow/react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/* ─── Shared mini-card base ─── */
function Card({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border-2 bg-card/90 backdrop-blur shadow-xl flex flex-col items-center gap-1 px-5 py-4',
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

/* ─── User / Input node ─── */
function UserNode(_: NodeProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="rounded-full border-2 border-zinc-600 bg-zinc-800/80 px-5 py-2.5 text-sm font-bold text-zinc-200 shadow-md">
        Vision Interview
      </div>
      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">User Input</span>
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-zinc-500" />
    </div>
  );
}

/* ─── CEO node — uses Abigail logo from public ─── */
function CeoNode(_: NodeProps) {
  return (
    <div className="flex flex-col items-center gap-2 min-w-[200px] relative">
      <Card
        className="border-amber-400/50 bg-amber-400/5 min-w-[200px]"
        style={{ animation: 'ceoPulse 3s ease-in-out infinite' }}
      >
        <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-amber-400/60" />
        <div className="relative w-14 h-14 rounded-full bg-amber-400/20 border-2 border-amber-400/40 flex items-center justify-center mb-1 overflow-hidden">
          <img
            src="/Abigail-gen-1/Abigail-gen-1.png"
            alt="Abigail CEO"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-sm font-bold text-foreground">Abigail CEO</div>
        <div className="text-[11px] text-amber-400 font-medium uppercase tracking-wider">9 Gate Controller</div>
        <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-amber-400/60" />
      </Card>
    </div>
  );
}

/* ─── Gate node (CEO spokes) ─── */
function GateNode({ data }: NodeProps) {
  const d = data as { label: string; colour: string };
  return (
    <div className={cn('rounded-lg border px-3 py-1.5 text-center min-w-[90px]', d.colour)}>
      <Handle type="target" position={Position.Top} className="opacity-0 pointer-events-none" />
      <div className="text-[10px] font-semibold uppercase tracking-wide">{d.label}</div>
      <Handle type="source" position={Position.Bottom} className="opacity-0 pointer-events-none" />
    </div>
  );
}

/* ─── Coordinator node — Unsplash photo ─── */
function CoordinatorNode(_: NodeProps) {
  return (
    <div className="relative flex flex-col items-center">
      <Card
        className="border-indigo-400/60 bg-indigo-400/5 min-w-[200px]"
        style={{ animation: 'glowBip 2.2s ease-in-out infinite' }}
      >
        <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-indigo-400" />
        <span
          className="absolute inset-0 rounded-2xl border-2 border-indigo-400/40 pointer-events-none"
          style={{ animation: 'radarPing 2s ease-out infinite' }}
        />
        <div className="w-14 h-14 rounded-full border-2 border-indigo-400/40 overflow-hidden mb-1 ring-2 ring-indigo-400/30">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face"
            alt="Atlas Coordinator"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-sm font-bold text-foreground">Atlas Coordinator</div>
        <div className="text-[11px] text-indigo-400 font-medium">Abigail Coordinator</div>
        <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-indigo-400" />
      </Card>
    </div>
  );
}

/* ─── Specialist node — Unsplash photo ─── */
function SpecialistNode({ data }: NodeProps) {
  const d = data as { name: string; role: string; colour: string; photo: string };
  return (
    <div
      className="relative rounded-xl border-2 bg-card/90 px-3 py-3 flex flex-col items-center gap-1 w-36 shadow-lg"
      style={{ borderColor: d.colour }}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-slate-400" />
      <div
        className="w-11 h-11 rounded-full overflow-hidden mb-0.5 ring-2"
        style={{ ringColor: d.colour }}
      >
        <img
          src={d.photo}
          alt={d.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="text-[12px] font-semibold text-foreground leading-tight">{d.name}</div>
      <div className="text-[10px] text-muted-foreground text-center leading-tight">{d.role}</div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-slate-400" />
    </div>
  );
}

/* ─── PRD Loop node ─── */
function PrdLoopNode(_: NodeProps) {
  return (
    <Card className="border-purple-400/50 bg-purple-400/5 min-w-[220px]">
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-purple-400" />
      <div className="w-12 h-12 rounded-full bg-purple-500/20 border-2 border-purple-400/40 flex items-center justify-center text-base font-bold text-purple-300 mb-1">
        PRD
      </div>
      <div className="text-sm font-bold text-foreground">PRD Execution Loop</div>
      <div className="text-[10px] text-purple-400 font-mono text-center mt-1">
        Requirements → Iterations → Evaluation
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-purple-400" />
    </Card>
  );
}

/* ─── Memory / Brain node ─── */
function MemoryNode(_: NodeProps) {
  return (
    <Card
      className="border-sky-400/50 bg-sky-400/5 min-w-[180px]"
      style={{ animation: 'glowBip 2.8s ease-in-out infinite' }}
    >
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-sky-400" />
      <span
        className="absolute inset-0 rounded-2xl border-2 border-sky-400/30 pointer-events-none"
        style={{ animation: 'radarPing 2.4s ease-out infinite' }}
      />
      <div className="w-12 h-12 rounded-full bg-sky-500/20 border-2 border-sky-400/40 flex items-center justify-center text-xl mb-1">
        🧠
      </div>
      <div className="text-sm font-bold text-foreground">Brain + Memory</div>
      <div className="text-[10px] text-sky-400 font-mono text-center mt-1">
        Episodic · Pattern · Parametric
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-sky-400" />
    </Card>
  );
}

/* ─── Evolution node ─── */
function EvolutionNode(_: NodeProps) {
  return (
    <Card className="border-orange-400/50 bg-orange-400/5 min-w-[180px]">
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-orange-400" />
      <div className="w-12 h-12 rounded-full bg-orange-500/20 border-2 border-orange-400/40 flex items-center justify-center text-xl mb-1">
        ⚡
      </div>
      <div className="text-sm font-bold text-foreground">Evolution Engine</div>
      <div className="text-[10px] text-orange-400 font-mono text-center mt-1">
        Soul · Nightly Learning
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-orange-400" />
    </Card>
  );
}

/* ─── Results node ─── */
function ResultsNode(_: NodeProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-green-500" />
      <div
        className="rounded-full border-2 border-green-500/50 bg-green-500/10 px-5 py-2.5 text-sm font-bold text-green-400 shadow-md"
        style={{ animation: 'glowBip 2s ease-in-out infinite' }}
      >
        ✓ Workflow Complete
      </div>
      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Delivered to User</span>
    </div>
  );
}

/* ─── Node type registry ─── */
const NODE_TYPES = {
  userNode: UserNode,
  ceoNode: CeoNode,
  gateNode: GateNode,
  coordinatorNode: CoordinatorNode,
  specialistNode: SpecialistNode,
  prdLoopNode: PrdLoopNode,
  memoryNode: MemoryNode,
  evolutionNode: EvolutionNode,
  resultsNode: ResultsNode,
};

/* ─── Static graph data ─── */
const SPECIALISTS = [
  {
    id: 'rex',
    name: 'Rex',
    role: 'Backend',
    colour: '#3B82F6',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 'nova',
    name: 'Nova',
    role: 'Frontend',
    colour: '#8B5CF6',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 'sage',
    name: 'Sage',
    role: 'QA Tests',
    colour: '#10B981',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 'felix',
    name: 'Felix',
    role: 'Security',
    colour: '#EF4444',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face',
  },
  {
    id: 'kai',
    name: 'Kai',
    role: 'Review',
    colour: '#F59E0B',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
  },
];

const GATES = [
  { id: 'gate-vision',  label: 'Vision',  colour: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'gate-rules',   label: 'Rules',   colour: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { id: 'gate-budget',  label: 'Budget',  colour: 'bg-green-500/10 text-green-400 border-green-500/20' },
  { id: 'gate-auth',    label: 'Auth',    colour: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
];

const CX = 400;

function buildNodes(): Node[] {
  return [
    { id: 'user',        type: 'userNode',        position: { x: CX - 100, y: 0 },    data: {} },
    { id: 'ceo',         type: 'ceoNode',          position: { x: CX - 100, y: 120 },  data: {} },
    ...GATES.map((g, i) => ({
      id: g.id,
      type: 'gateNode',
      position: { x: CX - 240 + i * 120, y: 270 },
      data: { label: g.label, colour: g.colour },
    })),
    { id: 'coordinator', type: 'coordinatorNode',  position: { x: CX - 100, y: 380 },  data: {} },
    ...SPECIALISTS.map((s, i) => ({
      id: s.id,
      type: 'specialistNode',
      position: { x: CX - 360 + i * 160, y: 570 },
      data: { name: s.name, role: s.role, colour: s.colour, photo: s.photo },
    })),
    { id: 'prd',         type: 'prdLoopNode',      position: { x: CX - 110, y: 760 },  data: {} },
    { id: 'memory',      type: 'memoryNode',        position: { x: CX - 260, y: 940 },  data: {} },
    { id: 'evolution',   type: 'evolutionNode',     position: { x: CX + 80,  y: 940 },  data: {} },
    { id: 'results',     type: 'resultsNode',       position: { x: CX - 100, y: 1110 }, data: {} },
  ];
}

function buildEdges(): Edge[] {
  const animated = true;
  return [
    { id: 'e-user-ceo',   source: 'user', target: 'ceo', animated, style: { stroke: '#F59E0B', strokeWidth: 2 } },
    ...GATES.map(g => ({
      id: `e-ceo-${g.id}`,
      source: 'ceo',
      target: g.id,
      animated,
      style: { stroke: '#F59E0B55', strokeWidth: 1, strokeDasharray: '4 3' },
    })),
    { id: 'e-ceo-coord',  source: 'ceo', target: 'coordinator', animated, style: { stroke: '#818CF8', strokeWidth: 2 } },
    ...SPECIALISTS.map(s => ({
      id: `e-coord-${s.id}`,
      source: 'coordinator',
      target: s.id,
      animated,
      style: { stroke: '#818CF855', strokeWidth: 1.5 },
    })),
    ...SPECIALISTS.map(s => ({
      id: `e-${s.id}-prd`,
      source: s.id,
      target: 'prd',
      animated,
      style: { stroke: '#A855F755', strokeWidth: 1.5 },
    })),
    { id: 'e-prd-mem',  source: 'prd', target: 'memory',    animated, style: { stroke: '#38BDF8', strokeWidth: 2 } },
    { id: 'e-prd-evo',  source: 'prd', target: 'evolution', animated, style: { stroke: '#FB923C', strokeWidth: 2 } },
    { id: 'e-mem-res',  source: 'memory',    target: 'results', animated, style: { stroke: '#22C55E', strokeWidth: 2 } },
    { id: 'e-evo-res',  source: 'evolution', target: 'results', animated, style: { stroke: '#22C55E', strokeWidth: 2 } },
  ];
}

/* ─── Main export ─── */
export function AbigailPipelineFlow() {
  const nodes = useMemo(buildNodes, []);
  const edges = useMemo(buildEdges, []);

  return (
    <div className="w-full rounded-2xl border border-zinc-900 overflow-hidden" style={{ height: 720 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        minZoom={0.3}
        maxZoom={1.4}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#27272a" />
        <Controls showInteractive={false} className="!bg-zinc-900 !border-zinc-800 !rounded-xl" />
      </ReactFlow>
    </div>
  );
}
